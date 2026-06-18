import { unzipSync, strFromU8 } from "fflate";

export type ZipFile = {
  path: string;
  name: string;
  size: number;
  data: Uint8Array;
};

export type DetectedKind =
  | { kind: "html"; entry: string }
  | { kind: "python"; entry: string }
  | { kind: "data" }
  | { kind: "unsupported"; reason: string; offenders: string[] };

export async function readZip(file: File): Promise<ZipFile[]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(buf);
  const out: ZipFile[] = [];
  for (const [path, data] of Object.entries(entries)) {
    if (path.endsWith("/")) continue; // directory
    const name = path.split("/").pop() ?? path;
    out.push({ path, name, size: data.length, data });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

const UNSUPPORTED_EXT = [".exe", ".msi", ".app", ".dmg", ".jar", ".class", ".deb", ".rpm", ".bin"];

export function detect(files: ZipFile[]): DetectedKind {
  const offenders = files
    .filter((f) => UNSUPPORTED_EXT.some((e) => f.name.toLowerCase().endsWith(e)))
    .map((f) => f.path);

  // HTML detection: prefer index.html (shallowest path wins)
  const htmls = files
    .filter((f) => f.name.toLowerCase() === "index.html")
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length);
  if (htmls.length > 0) return { kind: "html", entry: htmls[0].path };

  const anyHtml = files.find((f) => f.name.toLowerCase().endsWith(".html"));
  if (anyHtml) return { kind: "html", entry: anyHtml.path };

  // Python detection: prefer main.py, else single .py
  const pys = files.filter((f) => f.name.toLowerCase().endsWith(".py"));
  if (pys.length > 0) {
    const main = pys.find((f) => f.name.toLowerCase() === "main.py") ?? pys[0];
    return { kind: "python", entry: main.path };
  }

  if (offenders.length > 0) {
    return {
      kind: "unsupported",
      reason: "Diese ZIP enthält fertige Programme (.exe/.app/.jar). Browser können solche Binärdateien nicht ausführen.",
      offenders,
    };
  }

  return { kind: "data" };
}

export function textOf(f: ZipFile): string {
  return strFromU8(f.data);
}

const MIME: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "application/javascript",
  mjs: "application/javascript",
  json: "application/json",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  txt: "text/plain",
  md: "text/markdown",
  wasm: "application/wasm",
};

export function mimeOf(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

/**
 * Build an isolated HTML document that can be loaded into a sandboxed iframe.
 * All sibling assets in the ZIP are turned into blob: URLs and references in
 * the HTML are rewritten so relative paths resolve.
 */
export function buildHtmlBundle(files: ZipFile[], entryPath: string): string {
  const baseDir = entryPath.includes("/")
    ? entryPath.slice(0, entryPath.lastIndexOf("/") + 1)
    : "";

  // Build blob URL map for every file
  const urlMap = new Map<string, string>();
  for (const f of files) {
    const blob = new Blob([f.data as BlobPart], { type: mimeOf(f.name) });
    urlMap.set(f.path, URL.createObjectURL(blob));
  }

  const entry = files.find((f) => f.path === entryPath);
  if (!entry) return "<p>Entry HTML not found</p>";
  let html = textOf(entry);

  // Resolve a referenced path against the entry's directory, then look up in urlMap
  const resolve = (ref: string): string | null => {
    if (/^(https?:|data:|blob:|mailto:|#|\/\/)/i.test(ref)) return null;
    let p = ref.replace(/^\.\//, "").replace(/^\//, "");
    // Resolve relative to baseDir
    const stack = (baseDir + p).split("/");
    const resolved: string[] = [];
    for (const seg of stack) {
      if (seg === "" || seg === ".") continue;
      if (seg === "..") resolved.pop();
      else resolved.push(seg);
    }
    const key = resolved.join("/");
    // strip query/hash for lookup
    const clean = key.split("?")[0].split("#")[0];
    return urlMap.get(clean) ?? null;
  };

  // Rewrite src/href/poster attributes
  html = html.replace(
    /\b(src|href|poster)\s*=\s*("([^"]+)"|'([^']+)')/gi,
    (m, attr, _q, dq, sq) => {
      const ref = dq ?? sq;
      const replaced = resolve(ref);
      return replaced ? `${attr}="${replaced}"` : m;
    },
  );

  // Rewrite url(...) in inline styles
  html = html.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, _q, ref) => {
    const replaced = resolve(ref);
    return replaced ? `url("${replaced}")` : m;
  });

  return html;
}
