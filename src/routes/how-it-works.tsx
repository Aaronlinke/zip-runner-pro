import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getPyodide } from "@/lib/python-runner";
import { getSql } from "@/lib/engines/sqlite";
import { runLua } from "@/lib/engines/lua";
import { aiChat } from "@/lib/ai/translate-zip";
import { Play, Loader2, ArrowLeft, Cpu, Database, Terminal, Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "So funktioniert ZippyOS — echte Engines, live im Browser" },
      {
        name: "description",
        content:
          "Kein Fake, kein Screenshot: Python, SQLite, Lua und Lovable AI laufen hier live in deinem Browser. Klick auf ▶ und schau selbst.",
      },
      { property: "og:title", content: "So funktioniert ZippyOS — live Beweise" },
      {
        property: "og:description",
        content: "Pyodide, sql.js, wasmoon und Lovable AI Gateway — alles live testbar.",
      },
    ],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white text-zinc-900">
      <header className="mx-auto max-w-4xl px-4 pt-8 pb-4 sm:px-6 sm:pt-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-3 w-3" /> Zurück zum Desktop
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
          Nichts abkopiert. <span className="text-[#0071e3]">Alles live.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
          ZippyOS führt echten Code in deinem Browser aus — Python, SQLite, Lua, WebAssembly und
          Lovable AI. Kein Server rendert Screenshots. Kein Video wird abgespielt. Drück auf ▶ und
          verändere den Code. Du siehst das Ergebnis in dem Moment, in dem du es startest.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-zinc-500">
          {[
            "Pyodide (Python-Compiler in Wasm)",
            "sql.js (SQLite in Wasm)",
            "wasmoon (Lua in Wasm)",
            "Lovable AI Gateway (Gemini)",
            "TanStack Start + React 19",
          ].map((t) => (
            <span
              key={t}
              className="rounded-full border border-black/5 bg-white px-2.5 py-1 shadow-sm"
            >
              {t}
            </span>
          ))}
        </div>
      </header>

      <main className="mx-auto grid max-w-4xl gap-4 px-4 pb-16 sm:px-6 sm:gap-5">
        <PythonDemo />
        <SqliteDemo />
        <LuaDemo />
        <AiDemo />

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Warum das kein Abklatsch ist</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            {[
              "Der Code, den du oben ausgeführt hast, wurde in deinem Browser kompiliert und ausgeführt — nicht auf einem Server.",
              "Du kannst jede Zeile ändern und neu starten. Live. Ohne Deploy.",
              "Die Lovable-AI-Antwort ist ein frischer Streaming-Call — jedes Mal anders formuliert.",
              "ZIP-Uploads laufen genauso: Der Browser packt aus, wählt die passende Engine, startet die App.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-4 text-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-[#0060c0]"
          >
            Jetzt eine ZIP ausprobieren →
          </Link>
        </div>
      </main>
    </div>
  );
}

/* ---------- Demo Cards ---------- */

function DemoCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-900 text-white">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold sm:text-base">{title}</h3>
          <p className="truncate text-xs text-zinc-500">{subtitle}</p>
        </div>
      </header>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

function Runner({
  initial,
  onRun,
  label = "Ausführen",
  lang = "text",
}: {
  initial: string;
  onRun: (code: string, log: (s: string) => void) => Promise<void>;
  label?: string;
  lang?: string;
}) {
  const [code, setCode] = useState(initial);
  const [out, setOut] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setOut([]);
    const log = (s: string) => setOut((o) => [...o, s]);
    try {
      await onRun(code, log);
    } catch (e: any) {
      log("Fehler: " + (e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        className="h-32 w-full resize-y rounded-lg border border-zinc-200 bg-zinc-950 p-3 font-mono text-[12px] leading-relaxed text-zinc-100 focus:border-[#0071e3] focus:outline-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-zinc-400">{lang}</span>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0071e3] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0060c0] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          {label}
        </button>
      </div>
      {out.length > 0 && (
        <pre className="max-h-48 overflow-auto rounded-lg border border-emerald-200 bg-emerald-50 p-3 font-mono text-[11px] leading-relaxed text-emerald-900 whitespace-pre-wrap">
          {out.join("\n")}
        </pre>
      )}
    </div>
  );
}

function PythonDemo() {
  return (
    <DemoCard
      icon={<Cpu className="h-4 w-4" />}
      title="Python — läuft in deinem Browser"
      subtitle="Pyodide kompiliert CPython nach WebAssembly. Kein Server."
    >
      <Runner
        lang="python"
        initial={`# Erste 20 Primzahlen
def primes(n):
    r, x = [], 2
    while len(r) < n:
        if all(x % p for p in r): r.append(x)
        x += 1
    return r
print(primes(20))`}
        onRun={async (code, log) => {
          const py = await getPyodide(log);
          const result = await py.runPythonAsync(code);
          if (result !== undefined && result !== null) log("=> " + String(result));
        }}
      />
    </DemoCard>
  );
}

function SqliteDemo() {
  return (
    <DemoCard
      icon={<Database className="h-4 w-4" />}
      title="SQLite — eine echte Datenbank im Tab"
      subtitle="sql.js: SQLite als WebAssembly-Modul, komplett client-side."
    >
      <Runner
        lang="sql"
        initial={`CREATE TABLE band(name TEXT, year INT);
INSERT INTO band VALUES ('Kraftwerk',1970),('Rammstein',1994),('Tocotronic',1993);
SELECT name, year FROM band WHERE year > 1980 ORDER BY year;`}
        onRun={async (code, log) => {
          const SQL = await getSql();
          const db = new SQL.Database();
          const results = db.exec(code);
          if (results.length === 0) {
            log("(keine Rückgabe — Statement ausgeführt)");
          } else {
            for (const r of results) {
              log(r.columns.join(" | "));
              log("-".repeat(r.columns.join(" | ").length));
              for (const row of r.values) log(row.join(" | "));
            }
          }
          db.close();
        }}
      />
    </DemoCard>
  );
}

function LuaDemo() {
  return (
    <DemoCard
      icon={<Terminal className="h-4 w-4" />}
      title="Lua — Skript-Sprache, ebenfalls in Wasm"
      subtitle="wasmoon startet die Lua-VM direkt im Browser."
    >
      <Runner
        lang="lua"
        initial={`local sum = 0
for i = 1, 100 do sum = sum + i end
print("Summe 1..100 =", sum)
print("Zufall:", math.random(1, 1000))`}
        onRun={async (code, log) => {
          await runLua(code, log);
        }}
      />
    </DemoCard>
  );
}

function AiDemo() {
  const [q, setQ] = useState("Erklär mir in einem Satz, was ZippyOS macht.");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    setBusy(true);
    setReply("");
    try {
      const r = await aiChat({
        zipName: "how-it-works",
        appHtml: "<html><body>Beweis-Seite</body></html>",
        question: q,
        history: [],
      });
      setReply(r);
    } catch (e: any) {
      setReply("Fehler: " + (e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DemoCard
      icon={<Sparkles className="h-4 w-4" />}
      title="Lovable AI — live geantwortet, nicht aufgezeichnet"
      subtitle="Google Gemini über den Lovable AI Gateway. Frag was Neues und die Antwort ist neu."
    >
      <div className="space-y-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={busy}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#0071e3] focus:outline-none"
        />
        <div className="flex justify-end">
          <button
            onClick={ask}
            disabled={busy || !q.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0071e3] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0060c0] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            KI fragen
          </button>
        </div>
        {reply && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm leading-relaxed whitespace-pre-wrap text-violet-900">
            {reply}
          </div>
        )}
      </div>
    </DemoCard>
  );
}
