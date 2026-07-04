import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { readZip } from "@/lib/zip-runner";
import { detectLaunch } from "@/lib/launcher";
import { useWindows } from "@/lib/window-manager";
import { MenuBar } from "@/components/desktop/MenuBar";
import { Dock } from "@/components/desktop/Dock";
import { DropZone } from "@/components/desktop/DropZone";
import { DesktopWindow } from "@/components/desktop/Window";
import {
  HtmlWindow,
  PythonWindow,
  SqliteWindow,
  LuaWindow,
  JsWindow,
  WasmWindow,
  FilesWindow,
  UnsupportedWindow,
} from "@/components/desktop/windows";
import { AiAppWindow } from "@/components/desktop/AiAppWindow";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZippyOS — ZIP rein, App läuft" },
      {
        name: "description",
        content:
          "Browser-Desktop, der ZIPs wie installierte Apps öffnet. Python, SQLite, Lua, JavaScript, WebAssembly und Web-Apps — alles lokal, ohne Installation.",
      },
      { property: "og:title", content: "ZippyOS" },
      { property: "og:description", content: "Dein Browser als Mini-Betriebssystem für ZIPs." },
    ],
  }),
  component: Desktop,
});

function Desktop() {
  const windows = useWindows((s) => s.windows);
  const openWindow = useWindows((s) => s.open);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const files = await readZip(file);
        const launch = detectLaunch(files, file.name);
        openWindow({
          title: launch.title,
          kind: launch.kind,
          files,
          entry: launch.entry,
          payload: { ...launch, zipName: file.name },
          w: launch.kind === "html" || launch.kind === "ai-translated" ? 960 : launch.kind === "sqlite" ? 900 : 760,
          h: launch.kind === "html" || launch.kind === "ai-translated" ? 640 : 540,
        });
      } catch (e: any) {
        setError("ZIP konnte nicht gelesen werden: " + (e?.message ?? String(e)));
      }
    },
    [openWindow],
  );

  return (
    <div
      className="relative h-screen w-screen overflow-hidden text-zinc-900 select-none"
      style={{
        background:
          "radial-gradient(1200px 700px at 20% 10%, #e0e7ff 0%, transparent 60%)," +
          "radial-gradient(900px 600px at 90% 90%, #fce7f3 0%, transparent 55%)," +
          "linear-gradient(180deg, #f5f5f7 0%, #ffffff 100%)",
      }}
    >
      <MenuBar />

      {/* Desktop area */}
      <div className="absolute inset-0 top-7 bottom-0">
        {/* Welcome / drop zone in center when no windows */}
        {windows.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5 px-4 pb-24 text-center sm:gap-6 sm:px-6">
            <div className="pointer-events-auto">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                Willkommen bei <span className="text-[#0071e3]">ZippyOS</span>
              </h1>
              <p className="mt-2 text-xs text-zinc-600 sm:text-sm">
                ZIP rein — die App läuft. Direkt im Browser, auch am Handy.
              </p>
            </div>
            <DropZone onFile={handleFile} />
            <div className="pointer-events-none flex max-w-md flex-wrap justify-center gap-1.5 text-[10px] text-zinc-500 sm:text-[11px]">
              {["HTML/JS", "Python", "SQLite", "Lua", "JavaScript", "Wasm", "CSV/JSON/Bilder"].map((t) => (
                <span key={t} className="rounded-full border border-black/5 bg-white/70 px-2 py-1 backdrop-blur">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Hidden dropzone always listens via window events; show a tiny anchor so input ref exists when needed */}
        {windows.length > 0 && (
          <div className="pointer-events-none absolute right-6 top-3 opacity-0">
            <DropZone onFile={handleFile} />
          </div>
        )}

        {/* Render windows */}
        {windows.map((w) => (
          <DesktopWindow key={w.id} win={w}>
            {w.kind === "html" && w.entry && <HtmlWindow files={w.files} entry={w.entry} />}
            {w.kind === "python" && w.entry && <PythonWindow files={w.files} entry={w.entry} />}
            {w.kind === "sqlite" && w.entry && <SqliteWindow files={w.files} entry={w.entry} />}
            {w.kind === "lua" && w.entry && <LuaWindow files={w.files} entry={w.entry} />}
            {w.kind === "javascript" && w.entry && <JsWindow files={w.files} entry={w.entry} />}
            {w.kind === "wasm" && w.entry && <WasmWindow files={w.files} entry={w.entry} />}
            {(w.kind === "files" || w.kind === "data") && <FilesWindow files={w.files} />}
            {w.kind === "ai-translated" && (
              <AiAppWindow files={w.files} zipName={w.payload?.zipName ?? w.title} />
            )}
            {w.kind === "unsupported" && (
              <UnsupportedWindow
                reason={w.payload?.reason ?? ""}
                offenders={w.payload?.offenders ?? []}
                files={w.files}
              />
            )}
          </DesktopWindow>
        ))}
      </div>

      {error && (
        <div className="fixed top-10 left-1/2 z-[10001] -translate-x-1/2 rounded-xl border border-red-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="flex items-start gap-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-xs text-zinc-500 hover:underline">
              schließen
            </button>
          </div>
        </div>
      )}

      <Dock
        onAdd={() => {
          // Trigger the welcome dropzone's input — easiest: synthesize a click on a hidden input
          const input = document.querySelector<HTMLInputElement>('input[type="file"][accept=".zip,application/zip"]');
          input?.click();
        }}
      />
    </div>
  );
}
