import { useEffect, useMemo, useRef, useState } from "react";
import type { ZipFile } from "@/lib/zip-runner";
import { buildHtmlBundle, mimeOf, textOf } from "@/lib/zip-runner";
import { runPython } from "@/lib/python-runner";
import { openDatabase } from "@/lib/engines/sqlite";
import { runLua } from "@/lib/engines/lua";
import { Play, Download, FileText, Image as ImageIcon, AlertTriangle, Folder } from "lucide-react";
import Papa from "papaparse";

function formatBytes(n: number) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}

// ───── HTML ─────
export function HtmlWindow({ files, entry }: { files: ZipFile[]; entry: string }) {
  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    const html = buildHtmlBundle(files, entry);
    return URL.createObjectURL(new Blob([html], { type: "text/html" }));
  }, [files, entry]);
  useEffect(() => { return () => { if (url) URL.revokeObjectURL(url); }; }, [url]);
  return (
    <iframe
      title="App"
      src={url}
      sandbox="allow-scripts allow-forms allow-pointer-lock allow-popups allow-modals"
      className="h-full w-full border-0 bg-white"
    />
  );
}

// ───── Python ─────
export function PythonWindow({ files, entry }: { files: ZipFile[]; entry: string }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const log = (l: string) => setLogs((p) => [...p, l]);

  const run = async () => {
    setLogs([]);
    setRunning(true);
    try {
      await runPython(files, entry, log);
    } catch (e: any) {
      log("✗ " + (e?.message ?? String(e)));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#1e1e2e] text-zinc-100">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs">
        <span className="font-mono opacity-70">python {entry}</span>
        <button
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-1 rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          <Play className="h-3 w-3" /> {running ? "Läuft…" : "Run"}
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
        {logs.length === 0 ? <span className="opacity-50">Klick auf Run, um das Skript auszuführen.</span> : logs.join("\n")}
      </pre>
    </div>
  );
}

// ───── SQLite ─────
export function SqliteWindow({ files, entry }: { files: ZipFile[]; entry: string }) {
  const [db, setDb] = useState<any>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<{ columns: string[]; values: any[][] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const file = files.find((f) => f.path === entry);
    if (!file) return;
    openDatabase(file.data).then((d) => {
      if (cancelled) return;
      setDb(d);
      const res = d.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      const ts = res[0]?.values.map((r: any[]) => String(r[0])) ?? [];
      setTables(ts);
      if (ts[0]) {
        const q = `SELECT * FROM "${ts[0]}" LIMIT 100`;
        setQuery(q);
        runQuery(d, q);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [files, entry]);

  const runQuery = (d: any, q: string) => {
    try {
      const res = d.exec(q);
      setRows(res[0] ?? { columns: [], values: [] });
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setRows(null);
    }
  };

  return (
    <div className="flex h-full">
      <aside className="w-48 shrink-0 overflow-auto border-r border-zinc-200 bg-zinc-50 p-2">
        <p className="mb-1 px-1 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Tabellen</p>
        {tables.map((t) => (
          <button
            key={t}
            onClick={() => {
              const q = `SELECT * FROM "${t}" LIMIT 100`;
              setQuery(q);
              if (db) runQuery(db, q);
            }}
            className="block w-full truncate rounded px-2 py-1 text-left font-mono text-xs hover:bg-white"
          >
            {t}
          </button>
        ))}
        {tables.length === 0 && <p className="px-1 text-xs text-zinc-500">Lade…</p>}
      </aside>
      <div className="flex flex-1 flex-col">
        <div className="flex gap-2 border-b border-zinc-200 bg-white p-2">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={2}
            className="flex-1 resize-none rounded border border-zinc-200 px-2 py-1 font-mono text-xs"
          />
          <button
            onClick={() => db && runQuery(db, query)}
            className="self-start rounded bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600"
          >
            SQL ausführen
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {err && <div className="m-2 rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
          {rows && (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-100">
                <tr>
                  {rows.columns.map((c) => (
                    <th key={c} className="px-2 py-1 text-left font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.values.map((row, i) => (
                  <tr key={i} className="border-t border-zinc-100">
                    {row.map((v, j) => (
                      <td key={j} className="px-2 py-1 font-mono text-[11px]">
                        {v === null ? <em className="text-zinc-400">null</em> : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ───── Lua ─────
export function LuaWindow({ files, entry }: { files: ZipFile[]; entry: string }) {
  const file = files.find((f) => f.path === entry);
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const run = async () => {
    if (!file) return;
    setLogs([]);
    setRunning(true);
    try {
      await runLua(textOf(file), (l) => setLogs((p) => [...p, l]));
    } catch (e: any) {
      setLogs((p) => [...p, "✗ " + (e?.message ?? String(e))]);
    } finally {
      setRunning(false);
    }
  };
  return (
    <div className="flex h-full flex-col bg-[#1e1e2e] text-zinc-100">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs">
        <span className="font-mono opacity-70">lua {entry}</span>
        <button onClick={run} disabled={running} className="inline-flex items-center gap-1 rounded bg-indigo-500 px-2 py-0.5 text-[11px] font-medium hover:bg-indigo-600 disabled:opacity-50">
          <Play className="h-3 w-3" /> {running ? "Läuft…" : "Run"}
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-3 font-mono text-[12px] whitespace-pre-wrap">
        {logs.length === 0 ? <span className="opacity-50">Klick auf Run.</span> : logs.join("\n")}
      </pre>
    </div>
  );
}

// ───── JavaScript ─────
export function JsWindow({ files, entry }: { files: ZipFile[]; entry: string }) {
  const file = files.find((f) => f.path === entry);
  const [logs, setLogs] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.__zippy === "log") setLogs((p) => [...p, e.data.line]);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const run = () => {
    if (!file) return;
    setLogs([]);
    const code = textOf(file);
    const html = `<!doctype html><script>
      const send=(level,args)=>parent.postMessage({__zippy:'log',line:(level==='error'?'✗ ':level==='warn'?'⚠ ':'')+args.map(a=>{try{return typeof a==='object'?JSON.stringify(a):String(a)}catch{return String(a)}}).join(' ')},'*');
      ['log','info','warn','error'].forEach(k=>{const o=console[k].bind(console);console[k]=(...a)=>{send(k,a);o(...a)}});
      window.onerror=(m,_s,_l,_c,e)=>send('error',[e?.stack||m]);
      window.addEventListener('unhandledrejection',ev=>send('error',[ev.reason?.stack||String(ev.reason)]));
      try{
${code}
      }catch(e){send('error',[e.stack||String(e)])}
    </script>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    if (iframeRef.current) iframeRef.current.src = url;
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="flex h-full flex-col bg-[#1e1e2e] text-zinc-100">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs">
        <span className="font-mono opacity-70">js {entry}</span>
        <button onClick={run} className="inline-flex items-center gap-1 rounded bg-yellow-500 px-2 py-0.5 text-[11px] font-medium text-black hover:bg-yellow-600">
          <Play className="h-3 w-3" /> Run
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-3 font-mono text-[12px] whitespace-pre-wrap">
        {logs.length === 0 ? <span className="opacity-50">Klick auf Run, um den Code in einer Sandbox auszuführen.</span> : logs.join("\n")}
      </pre>
      <iframe ref={iframeRef} title="js-sandbox" sandbox="allow-scripts" className="hidden" />
    </div>
  );
}

// ───── Wasm ─────
export function WasmWindow({ files, entry }: { files: ZipFile[]; entry: string }) {
  const file = files.find((f) => f.path === entry);
  const [info, setInfo] = useState<string>("Lade Wasm-Modul…");
  useEffect(() => {
    if (!file) return;
    WebAssembly.compile(file.data as BufferSource)
      .then((mod) => {
        const imports = WebAssembly.Module.imports(mod);
        const exports = WebAssembly.Module.exports(mod);
        setInfo(
          [
            `📦  ${entry} (${formatBytes(file.size)})`,
            "",
            `Exports (${exports.length}):`,
            ...exports.map((e) => `  • ${e.name} : ${e.kind}`),
            "",
            `Imports (${imports.length}):`,
            ...imports.map((i) => `  • ${i.module}.${i.name} : ${i.kind}`),
          ].join("\n"),
        );
      })
      .catch((e) => setInfo("✗ " + (e?.message ?? String(e))));
  }, [file, entry]);
  return (
    <pre className="h-full overflow-auto bg-[#1e1e2e] p-4 font-mono text-xs whitespace-pre-wrap text-zinc-100">
      {info}
    </pre>
  );
}

// ───── File browser / Data ─────
export function FilesWindow({ files }: { files: ZipFile[] }) {
  const [sel, setSel] = useState<ZipFile | null>(files[0] ?? null);
  return (
    <div className="flex h-full">
      <aside className="w-64 shrink-0 overflow-auto border-r border-zinc-200 bg-zinc-50 p-1">
        {files.map((f) => (
          <button
            key={f.path}
            onClick={() => setSel(f)}
            className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs hover:bg-white ${
              sel?.path === f.path ? "bg-white shadow-sm" : ""
            }`}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {mimeOf(f.name).startsWith("image/") ? (
                <ImageIcon className="h-3 w-3 shrink-0 text-zinc-400" />
              ) : (
                <FileText className="h-3 w-3 shrink-0 text-zinc-400" />
              )}
              <span className="truncate font-mono">{f.path}</span>
            </span>
            <span className="shrink-0 text-[10px] text-zinc-400">{formatBytes(f.size)}</span>
          </button>
        ))}
      </aside>
      <div className="flex-1 overflow-auto bg-white">
        {sel ? <FilePreview file={sel} /> : <Empty />}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="grid h-full place-items-center text-sm text-zinc-400">
      <div className="flex flex-col items-center gap-2">
        <Folder className="h-10 w-10" />
        Keine Datei ausgewählt
      </div>
    </div>
  );
}

function FilePreview({ file }: { file: ZipFile }) {
  const name = file.name.toLowerCase();
  const mime = mimeOf(name);
  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    return URL.createObjectURL(new Blob([file.data as BlobPart], { type: mime }));
  }, [file, mime]);
  useEffect(() => { return () => { if (url) URL.revokeObjectURL(url); }; }, [url]);

  const dl = (
    <a
      href={url}
      download={file.name}
      className="inline-flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
    >
      <Download className="h-3 w-3" /> Download
    </a>
  );

  const header = (
    <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 text-xs">
      <span className="font-mono">{file.path}</span>
      {dl}
    </div>
  );

  if (mime.startsWith("image/"))
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex-1 overflow-auto p-4">
          <img src={url} alt={file.name} className="mx-auto max-h-full" />
        </div>
      </div>
    );

  if (mime.startsWith("audio/"))
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="grid flex-1 place-items-center"><audio src={url} controls /></div>
      </div>
    );

  if (mime.startsWith("video/"))
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="grid flex-1 place-items-center bg-black"><video src={url} controls className="max-h-full max-w-full" /></div>
      </div>
    );

  if (name.endsWith(".csv")) {
    const text = textOf(file);
    const parsed = Papa.parse<string[]>(text.slice(0, 500_000), { skipEmptyLines: true });
    const rows = parsed.data.slice(0, 500);
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={i === 0 ? "bg-zinc-100 font-medium" : "border-t border-zinc-100"}>
                  {r.map((c, j) => <td key={j} className="px-2 py-1 font-mono">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/javascript" ||
    /\.(py|lua|ts|tsx|jsx|md|yaml|yml|toml|ini|csv|xml|sh|c|cpp|h|rs|go)$/i.test(name)
  ) {
    let text = textOf(file).slice(0, 200_000);
    if (mime === "application/json") {
      try {
        text = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
    }
    return (
      <div className="flex h-full flex-col">
        {header}
        <pre className="flex-1 overflow-auto bg-[#1e1e2e] p-3 font-mono text-[12px] leading-relaxed text-zinc-100">
          <code>{text}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {header}
      <div className="grid flex-1 place-items-center text-sm text-zinc-500">
        Binärdatei ({formatBytes(file.size)}) — keine Vorschau
      </div>
    </div>
  );
}

// ───── Unsupported ─────
export function UnsupportedWindow({
  reason,
  offenders,
  files,
}: {
  reason: string;
  offenders: string[];
  files: ZipFile[];
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm text-amber-900">
          <p className="font-medium">Diese ZIP läuft nicht im Browser</p>
          <p className="mt-1">{reason}</p>
        </div>
      </div>
      <div className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500">
        Betroffene Dateien:
        <ul className="mt-1 list-disc pl-5 font-mono">
          {offenders.map((o) => <li key={o}>{o}</li>)}
        </ul>
      </div>
      <div className="flex-1 overflow-hidden">
        <FilesWindow files={files} />
      </div>
    </div>
  );
}
