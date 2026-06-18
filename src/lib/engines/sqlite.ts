import { useEngines } from "./registry";

let sqlPromise: Promise<any> | null = null;

export async function getSql() {
  if (!sqlPromise) {
    useEngines.getState().set("sqlite", "loading");
    sqlPromise = (async () => {
      const initSqlJs = (await import("sql.js")).default as any;
      const SQL = await initSqlJs({
        locateFile: (f: string) => `https://sql.js.org/dist/${f}`,
      });
      useEngines.getState().set("sqlite", "ready");
      return SQL;
    })().catch((e) => {
      useEngines.getState().set("sqlite", "error");
      throw e;
    });
  }
  return sqlPromise;
}

export async function openDatabase(data: Uint8Array) {
  const SQL = await getSql();
  return new SQL.Database(data);
}
