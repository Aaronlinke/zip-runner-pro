import { create } from "zustand";
import type { ZipFile } from "./zip-runner";

export type AppKind =
  | "html"
  | "python"
  | "sqlite"
  | "lua"
  | "javascript"
  | "wasm"
  | "data"
  | "files"
  | "ai-translated"
  | "unsupported";

export type WinState = {
  id: string;
  title: string;
  kind: AppKind;
  files: ZipFile[];
  entry?: string;
  payload?: any;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  prev?: { x: number; y: number; w: number; h: number };
};

type Store = {
  windows: WinState[];
  zCounter: number;
  open: (w: Omit<WinState, "x" | "y" | "w" | "h" | "z" | "minimized" | "maximized" | "id"> & { id?: string; w?: number; h?: number }) => string;
  close: (id: string) => void;
  focus: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, w: number, h: number) => void;
  toggleMin: (id: string) => void;
  toggleMax: (id: string) => void;
};

let openCount = 0;

export const useWindows = create<Store>((set, get) => ({
  windows: [],
  zCounter: 10,
  open: (w) => {
    const id = w.id ?? Math.random().toString(36).slice(2);
    const offset = (openCount++ % 6) * 28;
    const winW = w.w ?? 820;
    const winH = w.h ?? 560;
    const z = get().zCounter + 1;
    set((s) => ({
      zCounter: z,
      windows: [
        ...s.windows,
        {
          id,
          title: w.title,
          kind: w.kind,
          files: w.files,
          entry: w.entry,
          payload: w.payload,
          x: 80 + offset,
          y: 60 + offset,
          w: winW,
          h: winH,
          z,
          minimized: false,
          maximized: false,
        },
      ],
    }));
    return id;
  },
  close: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),
  focus: (id) =>
    set((s) => {
      const z = s.zCounter + 1;
      return {
        zCounter: z,
        windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)),
      };
    }),
  move: (id, x, y) =>
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)) })),
  resize: (id, w, h) =>
    set((s) => ({ windows: s.windows.map((win) => (win.id === id ? { ...win, w, h } : win)) })),
  toggleMin: (id) =>
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)) })),
  toggleMax: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized && w.prev) {
          return { ...w, ...w.prev, maximized: false, prev: undefined };
        }
        return {
          ...w,
          maximized: true,
          prev: { x: w.x, y: w.y, w: w.w, h: w.h },
          x: 0,
          y: 28,
          w: window.innerWidth,
          h: window.innerHeight - 28 - 88,
        };
      }),
    })),
}));
