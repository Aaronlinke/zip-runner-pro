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
    <div className="fixed top-0 right-0 left-0 z-[9999] flex h-7 items-center gap-4 border-b border-black/10 bg-white/60 px-4 text-[13px] text-zinc-800 backdrop-blur-xl">
      <Apple className="h-4 w-4 fill-zinc-800 text-zinc-800" />
      <span className="font-semibold">ZippyOS</span>
      <span className="text-zinc-500">Datei</span>
      <span className="text-zinc-500">Fenster</span>
      <span className="text-zinc-500">Hilfe</span>
      <div className="flex-1" />
      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
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
      <Wifi className="h-3.5 w-3.5 text-zinc-600" />
      <BatteryFull className="h-3.5 w-3.5 text-zinc-600" />
      <span className="tabular-nums">
        {now
          ? now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
          : "--:--"}
      </span>
    </div>
  );
}
