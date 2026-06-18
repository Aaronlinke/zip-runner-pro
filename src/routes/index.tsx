import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Upload, FileArchive, Play, AlertTriangle, Download, FileText, Image as ImageIcon, Code2, Database } from "lucide-react";
import {
  readZip,
  detect,
  buildHtmlBundle,
  textOf,
  mimeOf,
  type ZipFile,
  type DetectedKind,
} from "@/lib/zip-runner";
import { runPython } from "@/lib/python-runner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zippy Executor — ZIP rein, läuft" },
      {
        name: "description",
        content:
          "Lade eine ZIP-Datei hoch und das Tool führt automatisch aus, was drin ist: Web-Apps (HTML/JS), Python-Skripte oder Daten. Alles im Browser, nichts wird hochgeladen.",
      },
      { property: "og:title", content: "Zippy Executor" },
      { property: "og:description", content: "ZIP rein, Inhalt läuft — direkt im Browser." },
    ],
  }),
  component: Index,
});

type Status = "idle" | "loading" | "ready" | "running";

function formatBytes(n: number) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}

function Index() {
  const [files, setFiles] = useState<ZipFile[] | null>(null);
  const [zipName, setZipName] = useState<string>("");
  const [kind, setKind] = useState<DetectedKind | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<ZipFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setLogs([]);
    setIframeUrl(null);
    setSelected(null);
    setStatus("loading");
    setZipName(file.name);
    try {
      const entries = await readZip(file);
      setFiles(entries);
      setKind(detect(entries));
      setStatus("ready");
    } catch (e: any) {
      setError("ZIP konnte nicht gelesen werden: " + (e?.message ?? String(e)));
      setStatus("idle");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const run = useCallback(async () => {
    if (!files || !kind) return;
    setStatus("running");
    setLogs([]);
    setIframeUrl(null);
    try {
      if (kind.kind === "html") {
        const html = buildHtmlBundle(files, kind.entry);
        const blob = new Blob([html], { type: "text/html" });
        setIframeUrl(URL.createObjectURL(blob));
      } else if (kind.kind === "python") {
        await runPython(files, kind.entry, (line) =>
          setLogs((prev) => [...prev, line]),
        );
      }
    } catch (e: any) {
      setLogs((prev) => [...prev, "✗ " + (e?.message ?? String(e))]);
    } finally {
      setStatus("ready");
    }
  }, [files, kind]);

  const previewOfSelected = useMemo(() => {
    if (!selected) return null;
    const name = selected.name.toLowerCase();
    const mime = mimeOf(name);
    if (mime.startsWith("image/")) {
      const url = URL.createObjectURL(new Blob([selected.data as BlobPart], { type: mime }));
      return <img src={url} alt={selected.name} className="max-h-[60vh] rounded" />;
    }
    if (
      mime.startsWith("text/") ||
      mime === "application/json" ||
      mime === "application/javascript" ||
      name.endsWith(".py")
    ) {
      const text = textOf(selected);
      return (
        <pre className="max-h-[60vh] overflow-auto rounded bg-zinc-950 p-4 text-xs text-zinc-100">
          <code>{text.slice(0, 200_000)}</code>
        </pre>
      );
    }
    return (
      <div className="text-sm text-zinc-500">
        Binärdatei ({formatBytes(selected.size)}) — keine Vorschau verfügbar.
      </div>
    );
  }, [selected]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <FileArchive className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-lg font-semibold">Zippy Executor</h1>
            <p className="text-xs text-zinc-500">
              ZIP rein → Inhalt läuft. Alles lokal im Browser, nichts wird hochgeladen.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {!files && (
          <section>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 text-center transition ${
                dragOver
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-zinc-300 bg-white hover:border-indigo-400 hover:bg-zinc-50"
              }`}
            >
              <Upload className="mb-4 h-10 w-10 text-indigo-500" />
              <p className="text-base font-medium">ZIP-Datei hier ablegen oder klicken zum Auswählen</p>
              <p className="mt-1 text-xs text-zinc-500">
                Unterstützt: Web-Apps (HTML/JS), Python-Skripte, Daten-Dateien
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <FeatureCard icon={<Code2 className="h-5 w-5" />} title="Web-Apps" body="index.html mit JS/CSS läuft direkt in einer Sandbox." />
              <FeatureCard icon={<FileText className="h-5 w-5" />} title="Python" body="Echte Python-Skripte via Pyodide (WebAssembly)." />
              <FeatureCard icon={<Database className="h-5 w-5" />} title="Daten" body="CSV, JSON, Bilder — Vorschau und Download." />
            </div>
          </section>
        )}

        {files && (
          <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{zipName}</p>
                  <p className="text-xs text-zinc-500">{files.length} Dateien</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setFiles(null)}>
                  Neu
                </Button>
              </div>

              {kind && <KindBadge kind={kind} />}

              {(kind?.kind === "html" || kind?.kind === "python") && (
                <Button onClick={run} disabled={status === "running"} className="mt-3 w-full gap-2">
                  <Play className="h-4 w-4" />
                  {status === "running" ? "Läuft…" : "Ausführen"}
                </Button>
              )}

              <div className="mt-4 max-h-[55vh] overflow-auto border-t border-zinc-100 pt-3">
                <ul className="space-y-0.5 text-xs">
                  {files.map((f) => (
                    <li key={f.path}>
                      <button
                        onClick={() => setSelected(f)}
                        className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left hover:bg-zinc-100 ${
                          selected?.path === f.path ? "bg-indigo-50 text-indigo-700" : ""
                        }`}
                      >
                        <span className="truncate font-mono">{f.path}</span>
                        <span className="shrink-0 text-zinc-400">{formatBytes(f.size)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <div className="space-y-4">
              {kind?.kind === "unsupported" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  <div className="mb-2 flex items-center gap-2 font-medium text-amber-900">
                    <AlertTriangle className="h-4 w-4" /> Nicht im Browser ausführbar
                  </div>
                  <p className="text-amber-800">{kind.reason}</p>
                  <p className="mt-2 text-amber-800">
                    Du kannst die enthaltenen Dateien aber anschauen oder einzeln herunterladen.
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-amber-900">
                    {kind.offenders.map((o) => (
                      <li key={o} className="font-mono text-xs">
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {iframeUrl && (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 text-xs text-zinc-500">
                    <span>Web-App läuft in Sandbox</span>
                    <a
                      href={iframeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      In neuem Tab öffnen
                    </a>
                  </div>
                  <iframe
                    title="App"
                    src={iframeUrl}
                    sandbox="allow-scripts allow-forms allow-pointer-lock allow-popups allow-modals"
                    className="h-[70vh] w-full bg-white"
                  />
                </div>
              )}

              {(logs.length > 0 || status === "running") && kind?.kind === "python" && (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950">
                  <div className="border-b border-zinc-800 px-3 py-2 text-xs text-zinc-400">
                    Python-Konsole
                  </div>
                  <pre className="max-h-[50vh] overflow-auto p-3 text-xs leading-relaxed text-zinc-100">
                    {logs.join("\n") || "…"}
                  </pre>
                </div>
              )}

              {selected && (
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {mimeOf(selected.name).startsWith("image/") ? (
                        <ImageIcon className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="font-mono text-xs">{selected.path}</span>
                    </div>
                    <a
                      href={URL.createObjectURL(
                        new Blob([selected.data as BlobPart], {
                          type: mimeOf(selected.name),
                        }),
                      )}
                      download={selected.name}
                      className="inline-flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
                    >
                      <Download className="h-3 w-3" /> Download
                    </a>
                  </div>
                  {previewOfSelected}
                </div>
              )}

              {!iframeUrl && !selected && logs.length === 0 && kind?.kind !== "unsupported" && (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
                  Wähle links eine Datei zur Vorschau, oder klick auf <strong>Ausführen</strong>.
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-indigo-50 p-2 text-indigo-600">
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{body}</p>
    </div>
  );
}

function KindBadge({ kind }: { kind: DetectedKind }) {
  const map = {
    html: { label: "Web-App erkannt", color: "bg-emerald-100 text-emerald-800" },
    python: { label: "Python-Skript erkannt", color: "bg-blue-100 text-blue-800" },
    data: { label: "Nur Dateien / Daten", color: "bg-zinc-100 text-zinc-700" },
    unsupported: { label: "Nicht ausführbar", color: "bg-amber-100 text-amber-800" },
  } as const;
  const m = map[kind.kind];
  return (
    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${m.color}`}>
      {m.label}
      {kind.kind === "html" || kind.kind === "python" ? (
        <span className="ml-1 font-mono opacity-70">· {kind.entry}</span>
      ) : null}
    </div>
  );
}
