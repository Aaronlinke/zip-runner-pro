import { useEngines } from "./registry";

let luaPromise: Promise<any> | null = null;

export async function getLuaFactory() {
  if (!luaPromise) {
    useEngines.getState().set("lua", "loading");
    luaPromise = (async () => {
      const { LuaFactory } = await import("wasmoon");
      const factory = new LuaFactory();
      useEngines.getState().set("lua", "ready");
      return factory;
    })().catch((e) => {
      useEngines.getState().set("lua", "error");
      throw e;
    });
  }
  return luaPromise;
}

export async function runLua(code: string, onLog: (line: string) => void) {
  const factory = await getLuaFactory();
  const lua = await factory.createEngine();
  try {
    lua.global.set("print", (...args: any[]) =>
      onLog(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join("\t")),
    );
    const result = await lua.doString(code);
    if (result !== undefined) onLog("=> " + String(result));
  } finally {
    lua.global.close();
  }
}
