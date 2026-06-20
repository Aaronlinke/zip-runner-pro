import { useWindows } from "@/lib/window-manager";
import { FileArchive, Globe, FileCode2, Database, Code2, Boxes, FolderOpen, AlertTriangle, Plus } from "lucide-react";
import type { AppKind } from "@/lib/window-manager";

const ICON: Record<AppKind, React.ComponentType<{ className?: string }>> = {
  html: Globe,
  python: FileCode2,
  sqlite: Database,
  lua: Code2,
  javascript: Code2,
  wasm: Boxes,
  data: FolderOpen,
  files: FolderOpen,
  unsupported: AlertTriangle,
};

const TINT: Record<AppKind, string> = {
  html: "from-emerald-400 to-emerald-600",
  python: "from-blue-400 to-blue-600",
  sqlite: "from-orange-400 to-orange-600",
  lua: "from-indigo-400 to-indigo-600",
  javascript: "from-yellow-400 to-amber-500",
  wasm: "from-violet-400 to-violet-600",
  data: "from-slate-400 to-slate-600",
  files: "from-slate-400 to-slate-600",
  unsupported: "from-rose-400 to-rose-600",
};

export function Dock({ onAdd }: { onAdd: () => void }) {
  const windows = useWindows((s) => s.windows);
  const focus = useWindows((s) => s.focus);
  const toggleMin = useWindows((s) => s.toggleMin);

  return (
    <div className="pointer-events-none fixed right-0 bottom-2 left-0 z-[9998] flex justify-center px-2 sm:bottom-3">
      <div className="pointer-events-auto flex max-w-full items-end gap-2 overflow-x-auto rounded-2xl border border-white/40 bg-white/60 px-2 py-1.5 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:px-3 sm:py-2">
        <DockItem label="Neue App" tint="from-sky-400 to-blue-600" Icon={Plus} onClick={onAdd} />
        {windows.length > 0 && <div className="mx-1 h-10 w-px shrink-0 self-center bg-black/10 sm:h-12" />}
        {windows.map((w) => {
          const I = ICON[w.kind];
          return (
            <DockItem
              key={w.id}
              label={w.title}
              tint={TINT[w.kind]}
              Icon={I}
              active
              minimized={w.minimized}
              onClick={() => (w.minimized ? (toggleMin(w.id), focus(w.id)) : focus(w.id))}
            />
          );
        })}
      </div>
    </div>
  );
}

function DockItem({
  label,
  Icon,
  tint,
  active,
  minimized,
  onClick,
}: {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  tint: string;
  active?: boolean;
  minimized?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="group relative flex shrink-0 flex-col items-center" title={label}>
      <span className="pointer-events-none absolute -top-8 hidden rounded-md bg-black/80 px-2 py-0.5 text-[11px] whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100 sm:block">
        {label}
      </span>
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br sm:h-12 sm:w-12 ${tint} text-white shadow-md transition-transform duration-150 group-hover:-translate-y-1 group-hover:scale-110 ${
          minimized ? "opacity-60" : ""
        }`}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
      <span className={`mt-0.5 h-1 w-1 rounded-full ${active ? "bg-zinc-700" : "bg-transparent"}`} />
    </button>
  );
}
