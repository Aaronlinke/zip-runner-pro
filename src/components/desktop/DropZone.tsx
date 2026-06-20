import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";

export function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const over = (e: DragEvent) => {
      e.preventDefault();
      setHover(true);
    };
    const leave = (e: DragEvent) => {
      if ((e as any).fromElement === null) setHover(false);
    };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      setHover(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) onFile(f);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [onFile]);

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        className="group pointer-events-auto flex flex-col items-center gap-3 rounded-3xl border border-white/40 bg-white/40 px-8 py-8 shadow-xl backdrop-blur-xl transition hover:bg-white/60 sm:px-12 sm:py-10"
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md sm:h-16 sm:w-16">
          <Upload className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-zinc-900">ZIP auswählen</p>
          <p className="mt-1 text-xs text-zinc-600">am Handy tippen, am PC auch ziehen</p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onFile(f);
            e.target.value = "";
          }
        }}
      />
      {hover && (
        <div className="pointer-events-none fixed inset-0 z-[10000] flex items-center justify-center bg-blue-500/10 backdrop-blur-sm">
          <div className="rounded-3xl border-4 border-dashed border-blue-500 bg-white/80 px-12 py-8 text-center shadow-2xl">
            <p className="text-xl font-bold text-blue-600">ZIP loslassen</p>
            <p className="text-sm text-zinc-600">Die App wird automatisch geöffnet</p>
          </div>
        </div>
      )}
    </>
  );
}
