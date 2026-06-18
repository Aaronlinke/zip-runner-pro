// Loads Pyodide from CDN on demand and runs a python entry file with the
// rest of the zip contents mounted into the in-memory FS.
import type { ZipFile } from "./zip-runner";

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<any>;
  }
}

const PYODIDE_VERSION = "0.26.4";
const CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-pyodide]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("pyodide script error")));
      if ((existing as HTMLScriptElement).dataset.loaded === "1") resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.pyodide = "1";
    s.onload = () => {
      s.dataset.loaded = "1";
      resolve();
    };
    s.onerror = () => reject(new Error("pyodide script error"));
    document.head.appendChild(s);
  });
}

export async function getPyodide(onLog: (line: string) => void) {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      onLog("Lade Python-Laufzeit (einmalig, ca. 10 MB)…");
      await loadScript(CDN + "pyodide.js");
      if (!window.loadPyodide) throw new Error("Pyodide nicht verfügbar");
      const py = await window.loadPyodide({ indexURL: CDN });
      onLog("Python bereit.");
      return py;
    })();
  }
  return pyodidePromise;
}

export async function runPython(
  files: ZipFile[],
  entryPath: string,
  onLog: (line: string) => void,
) {
  const py = await getPyodide(onLog);

  // Capture stdout/stderr
  py.setStdout({ batched: (s: string) => onLog(s) });
  py.setStderr({ batched: (s: string) => onLog("⚠ " + s) });

  // Mount all files under /zip
  try {
    py.FS.mkdir("/zip");
  } catch {
    /* exists */
  }
  for (const f of files) {
    const fullPath = "/zip/" + f.path;
    const parts = fullPath.split("/").slice(1, -1);
    let cur = "";
    for (const p of parts) {
      cur += "/" + p;
      try {
        py.FS.mkdir(cur);
      } catch {
        /* exists */
      }
    }
    py.FS.writeFile(fullPath, f.data);
  }

  const baseDir = entryPath.includes("/")
    ? "/zip/" + entryPath.slice(0, entryPath.lastIndexOf("/"))
    : "/zip";
  const entryAbs = "/zip/" + entryPath;

  onLog(`▶ python ${entryPath}`);
  try {
    await py.runPythonAsync(`
import sys, os, runpy
sys.path.insert(0, ${JSON.stringify(baseDir)})
os.chdir(${JSON.stringify(baseDir)})
runpy.run_path(${JSON.stringify(entryAbs)}, run_name="__main__")
`);
    onLog("✓ Skript beendet.");
  } catch (e: any) {
    onLog("✗ Fehler: " + (e?.message ?? String(e)));
  }
}
