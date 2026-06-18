import { create } from "zustand";

export type EngineId = "python" | "sqlite" | "lua" | "javascript" | "wasm";

export type EngineStatus = "idle" | "loading" | "ready" | "error";

type Store = {
  status: Record<EngineId, EngineStatus>;
  set: (id: EngineId, status: EngineStatus) => void;
};

export const useEngines = create<Store>((set) => ({
  status: {
    python: "idle",
    sqlite: "idle",
    lua: "idle",
    javascript: "ready", // native
    wasm: "ready", // native
  },
  set: (id, status) => set((s) => ({ status: { ...s.status, [id]: status } })),
}));
