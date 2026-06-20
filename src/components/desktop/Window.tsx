import { useRef } from "react";
import { useWindows, type WinState } from "@/lib/window-manager";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { X, Minus, Square } from "lucide-react";

type Props = {
  win: WinState;
  children: React.ReactNode;
};

export function DesktopWindow({ win, children }: Props) {
  const { focus, close, move, toggleMin, toggleMax } = useWindows();
  const isMobile = useIsMobile();
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number; pid: number } | null>(null);

  const onPointerDownBar = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    if (win.maximized || isMobile) return;
    focus(win.id);
    dragRef.current = { ox: e.clientX, oy: e.clientY, sx: win.x, sy: win.y, pid: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const target = e.currentTarget as HTMLElement;
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current || ev.pointerId !== dragRef.current.pid) return;
      const dx = ev.clientX - dragRef.current.ox;
      const dy = ev.clientY - dragRef.current.oy;
      move(win.id, Math.max(0, dragRef.current.sx + dx), Math.max(28, dragRef.current.sy + dy));
    };
    const onUp = () => {
      dragRef.current = null;
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  if (win.minimized) return null;

  // On mobile, every window is fullscreen — no positioning, no resize
  const mobileStyle = isMobile
    ? { left: 0, top: 28, width: "100vw", height: "calc(100vh - 28px - 72px)", zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  return (
    <div
      onPointerDown={() => focus(win.id)}
      className={`absolute overflow-hidden border border-black/10 bg-white/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] backdrop-blur-xl ${
        isMobile ? "rounded-none" : "rounded-xl"
      }`}
      style={mobileStyle}
    >
      <div
        onPointerDown={onPointerDownBar}
        onDoubleClick={() => !isMobile && toggleMax(win.id)}
        className={`flex items-center gap-2 border-b border-black/5 bg-gradient-to-b from-zinc-50/95 to-zinc-100/90 select-none ${
          isMobile ? "h-11 px-3" : "h-9 cursor-grab px-3 active:cursor-grabbing"
        }`}
      >
        <div className="flex items-center gap-2" data-no-drag>
          <button
            onClick={() => close(win.id)}
            className={`grid place-items-center rounded-full bg-[#ff5f57] ${isMobile ? "h-5 w-5" : "h-3 w-3"}`}
            aria-label="Schließen"
          >
            <X className={isMobile ? "h-3 w-3 text-black/60" : "h-2 w-2 text-black/50 opacity-0"} strokeWidth={3} />
          </button>
          <button
            onClick={() => toggleMin(win.id)}
            className={`grid place-items-center rounded-full bg-[#febc2e] ${isMobile ? "h-5 w-5" : "h-3 w-3"}`}
            aria-label="Minimieren"
          >
            <Minus className={isMobile ? "h-3 w-3 text-black/60" : "h-2 w-2 text-black/50 opacity-0"} strokeWidth={3} />
          </button>
          {!isMobile && (
            <button
              onClick={() => toggleMax(win.id)}
              className="grid h-3 w-3 place-items-center rounded-full bg-[#28c840]"
              aria-label="Maximieren"
            >
              <Square className="h-2 w-2 text-black/50 opacity-0" strokeWidth={3} />
            </button>
          )}
        </div>
        <div className="flex-1 truncate text-center text-[13px] font-medium text-zinc-700">
          {win.title}
        </div>
        <div className="w-12" />
      </div>
      <div className={`overflow-auto bg-white ${isMobile ? "h-[calc(100%-2.75rem)]" : "h-[calc(100%-2.25rem)]"}`}>
        {children}
      </div>
    </div>
  );
}
