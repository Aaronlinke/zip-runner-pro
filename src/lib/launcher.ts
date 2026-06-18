import type { ZipFile } from "./zip-runner";
import type { AppKind } from "./window-manager";

export type Launch = {
  kind: AppKind;
  entry?: string;
  title: string;
  reason?: string;
  offenders?: string[];
};

const UNSUPPORTED_EXT = [".exe", ".msi", ".app", ".dmg", ".jar", ".class", ".deb", ".rpm"];

export function detectLaunch(files: ZipFile[], zipName: string): Launch {
  const baseName = zipName.replace(/\.zip$/i, "");

  // 1. HTML web app
  const htmls = files
    .filter((f) => f.name.toLowerCase() === "index.html")
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length);
  if (htmls.length) return { kind: "html", entry: htmls[0].path, title: baseName };
  const anyHtml = files.find((f) => f.name.toLowerCase().endsWith(".html"));
  if (anyHtml) return { kind: "html", entry: anyHtml.path, title: baseName };

  // 2. Python
  const pys = files.filter((f) => f.name.toLowerCase().endsWith(".py"));
  if (pys.length) {
    const main = pys.find((f) => f.name.toLowerCase() === "main.py") ?? pys[0];
    return { kind: "python", entry: main.path, title: baseName };
  }

  // 3. SQLite
  const db = files.find((f) => /\.(sqlite|db|sqlite3)$/i.test(f.name));
  if (db) return { kind: "sqlite", entry: db.path, title: baseName };

  // 4. Lua
  const lua = files.find((f) => /\.lua$/i.test(f.name));
  if (lua) return { kind: "lua", entry: lua.path, title: baseName };

  // 5. JavaScript / TypeScript
  const js = files.find((f) => /\.(m?js|ts)$/i.test(f.name) && !f.path.includes("node_modules"));
  if (js) return { kind: "javascript", entry: js.path, title: baseName };

  // 6. Wasm
  const wasm = files.find((f) => /\.wasm$/i.test(f.name));
  if (wasm) return { kind: "wasm", entry: wasm.path, title: baseName };

  // 7. Unsupported binaries
  const offenders = files
    .filter((f) => UNSUPPORTED_EXT.some((e) => f.name.toLowerCase().endsWith(e)))
    .map((f) => f.path);
  if (offenders.length) {
    return {
      kind: "unsupported",
      title: baseName,
      reason:
        "Diese ZIP enthält fertige Programme (.exe/.app/.jar). Browser können solche Binärdateien nicht ausführen — dafür bräuchtest du die Desktop-Version.",
      offenders,
    };
  }

  // 8. Pure data (CSV/JSON/images/etc.) — file browser
  return { kind: "files", title: baseName };
}
