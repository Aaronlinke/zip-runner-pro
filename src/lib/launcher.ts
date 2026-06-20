import type { ZipFile } from "./zip-runner";
import type { AppKind } from "./window-manager";

export type Launch = {
  kind: AppKind;
  entry?: string;
  title: string;
  reason?: string;
  offenders?: string[];
};

// Source-code extensions the AI can translate
const SOURCE_EXT = /\.(py|c|cpp|cc|h|hpp|rs|go|cs|swift|kt|java|rb|php|sh|bash|sql)$/i;
const BINARY_EXT = [".exe", ".msi", ".app", ".dmg", ".jar", ".class", ".deb", ".rpm"];

export function detectLaunch(files: ZipFile[], zipName: string): Launch {
  const baseName = zipName.replace(/\.zip$/i, "");

  // 1. HTML web app — runs directly
  const htmls = files
    .filter((f) => f.name.toLowerCase() === "index.html")
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length);
  if (htmls.length) return { kind: "html", entry: htmls[0].path, title: baseName };
  const anyHtml = files.find((f) => f.name.toLowerCase().endsWith(".html"));
  if (anyHtml) return { kind: "html", entry: anyHtml.path, title: baseName };

  // 2. Python — runs directly via Pyodide
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

  // 5. JavaScript / TypeScript standalone
  const js = files.find(
    (f) => /\.(m?js|ts)$/i.test(f.name) && !f.path.includes("node_modules"),
  );
  if (js) return { kind: "javascript", entry: js.path, title: baseName };

  // 6. Wasm
  const wasm = files.find((f) => /\.wasm$/i.test(f.name));
  if (wasm) return { kind: "wasm", entry: wasm.path, title: baseName };

  // 7. Has source code in any other language → let the AI rebuild it
  const hasSource = files.some((f) => SOURCE_EXT.test(f.name));
  if (hasSource) return { kind: "ai-translated", title: baseName };

  // 8. Only binaries → AI builds a demo from name/strings
  const hasBinary = files.some((f) =>
    BINARY_EXT.some((e) => f.name.toLowerCase().endsWith(e)),
  );
  if (hasBinary) return { kind: "ai-translated", title: baseName };

  // 9. Pure data → file browser
  return { kind: "files", title: baseName };
}
