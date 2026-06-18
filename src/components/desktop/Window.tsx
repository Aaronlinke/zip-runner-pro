import { useEffect, useRef, useState } from "react";
import { useWindows, type WinState } from "@/lib/window-manager";
import { X, Minus, Square } from "lucide-react";

type Props = {
  win: WinState;
  children: React.ReactNode;
};

export function DesktopWindow({ win, children }: Props) {
  const { focus, close, move, toggleMin, toggleMax } = useWindows();
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);

  const onMouseDownBar = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    if (win.maximized) return;
    focus(win.id);
    dragRef.current = { ox: e.clientX, oy: e.clientY, sx: win.x, sy: win.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.ox;
      const dy = ev.clientY - dragRef.current.oy;
      move(win.id, Math.max(0, dragRef.current.sx + dx), Math.max(28, dragRef.current.sy + dy));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  if (win.minimized) return null;

  return (
    <div
      onMouseDown={() => focus(win.id)}
      className="absolute overflow-hidden rounded-xl border border-black/10 bg-white/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-[opacity,transform] duration-200"
      style={{
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
      }}
    >
      <div
        onMouseDown={onMouseDownBar}
        onDoubleClick={() => toggleMax(win.id)}
        className="flex h-9 cursor-grab items-center gap-2 border-b border-black/5 bg-gradient-to-b from-zinc-50/95 to-zinc-100/90 px-3 select-none active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5" data-no-drag>
          <button
            onClick={() => close(win.id)}
            className="group grid h-3 w-3 place-items-center rounded-full bg-[#ff5f57] hover:brightness-95"
            aria-label="Schließen"
          >
            <X className="h-2 w-2 text-black/50 opacity-0 group-hover:opacity-100" strokeWidth={3} />
          </button>
          <button
            onClick={() => toggleMin(win.id)}
            className="group grid h-3 w-3 place-items-center rounded-full bg-[#febc2e] hover:brightness-95"
            aria-label="Minimieren"
          >
            <Minus className="h-2 w-2 text-black/50 opacity-0 group-hover:opacity-100" strokeWidth={3} />
          </button>
          <button
            onClick={() => toggleMax(win.id)}
            className="group grid h-3 w-3 place-items-center rounded-full bg-[#28c840] hover:brightness-95"
            aria-label="Maximieren"
          >
            <Square className="h-2 w-2 text-black/50 opacity-0 group-hover:opacity-100" strokeWidth={3} />
          </button>
        </div>
        <div className="flex-1 truncate text-center text-[13px] font-medium text-zinc-700">
          {win.title}
        </div>
        <div className="w-12" />
      </div>
      <div className="h-[calc(100%-2.25rem)] overflow-auto bg-white">{children}</div>
    </div>
  );
}
