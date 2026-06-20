import { useEffect, useState } from "react";
import { Apple, Wifi, BatteryFull } from "lucide-react";
import { useEngines, type EngineId } from "@/lib/engines/registry";

const LABEL: Record<EngineId, string> = {
  python: "Py",
  sqlite: "SQL",
  lua: "Lua",
  javascript: "JS",
  wasm: "Wasm",
};

export function MenuBar() {
  const status = useEngines((s) => s.status);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed top-0 right-0 left-0 z-[9999] flex h-7 items-center gap-3 border-b border-black/10 bg-white/60 px-3 text-[13px] text-zinc-800 backdrop-blur-xl sm:gap-4 sm:px-4">
      <Apple className="h-4 w-4 fill-zinc-800 text-zinc-800" />
      <span className="font-semibold">ZippyOS</span>
      <span className="hidden text-zinc-500 sm:inline">Datei</span>
      <span className="hidden text-zinc-500 sm:inline">Fenster</span>
      <span className="hidden text-zinc-500 sm:inline">Hilfe</span>
      <div className="flex-1" />
      <div className="hidden items-center gap-2 text-[11px] text-zinc-500 sm:flex">
        {(Object.keys(LABEL) as EngineId[]).map((id) => {
          const s = status[id];
          const color =
            s === "ready"
              ? "bg-emerald-500"
              : s === "loading"
                ? "bg-amber-400 animate-pulse"
                : s === "error"
                  ? "bg-red-500"
                  : "bg-zinc-300";
          return (
            <span key={id} className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
              {LABEL[id]}
            </span>
          );
        })}
      </div>
      {/* Compact engine dots on mobile */}
      <div className="flex items-center gap-1 sm:hidden">
        {(Object.keys(LABEL) as EngineId[]).map((id) => {
          const s = status[id];
          const color =
            s === "ready" ? "bg-emerald-500" : s === "loading" ? "bg-amber-400 animate-pulse" : s === "error" ? "bg-red-500" : "bg-zinc-300";
          return <span key={id} className={`h-1.5 w-1.5 rounded-full ${color}`} title={LABEL[id]} />;
        })}
      </div>
      <Wifi className="hidden h-3.5 w-3.5 text-zinc-600 sm:block" />
      <BatteryFull className="hidden h-3.5 w-3.5 text-zinc-600 sm:block" />
      <span className="tabular-nums">
        {now ? now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
      </span>
    </div>
  );
}
