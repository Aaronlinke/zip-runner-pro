import { useEffect, useRef, useState } from "react";
import type { ZipFile } from "@/lib/zip-runner";
import { aiTranslateZip, aiChat } from "@/lib/ai/translate-zip";
import { FilesWindow } from "@/components/desktop/windows";
import { Sparkles, Send, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

type Tab = "app" | "explain" | "code" | "chat";
type Msg = { role: "user" | "assistant"; content: string };

export function AiAppWindow({ files, zipName }: { files: ZipFile[]; zipName: string }) {
  const [tab, setTab] = useState<Tab>("app");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  const [history, setHistory] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

  const translate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiTranslateZip(zipName, files);
      setHtml(res.html);
      setExplanation(res.explanation);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    translate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iframeUrl = (() => {
    if (!html || typeof window === "undefined") return "";
    return URL.createObjectURL(new Blob([html], { type: "text/html" }));
  })();
  useEffect(() => {
    return () => {
      if (iframeUrl) URL.revokeObjectURL(iframeUrl);
    };
  }, [iframeUrl]);

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || chatBusy) return;
    setChatInput("");
    const newHist = [...history, { role: "user" as const, content: q }];
    setHistory(newHist);
    setChatBusy(true);
    try {
      const reply = await aiChat({ zipName, appHtml: html, question: q, history });
      setHistory([...newHist, { role: "assistant", content: reply }]);
      // If reply contains a full HTML block, swap the app
      const m = reply.match(/```html\s*([\s\S]*?)```/i);
      if (m && /<!doctype|<html/i.test(m[1])) {
        setHtml(m[1].trim());
        setTab("app");
      }
    } catch (e: any) {
      setHistory([...newHist, { role: "assistant", content: "Fehler: " + (e?.message ?? String(e)) }]);
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Tabs */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-zinc-50/80 px-2">
        {(
          [
            ["app", "App"],
            ["explain", "Was macht das?"],
            ["code", "Code"],
            ["chat", "KI-Chat"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 px-3 py-2 text-xs font-medium transition ${
              tab === id
                ? "border-b-2 border-[#0071e3] text-[#0071e3]"
                : "border-b-2 border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={translate}
          disabled={loading}
          className="mr-1 shrink-0 rounded p-1.5 text-zinc-500 hover:bg-zinc-200 disabled:opacity-50"
          title="Neu generieren"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* AI hint banner */}
      {!loading && !error && html && (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-violet-100 bg-violet-50 px-3 py-1.5 text-[11px] text-violet-800">
          <Sparkles className="h-3 w-3" />
          Nachgebaut von Lovable AI aus dem Quellcode — kann an Details abweichen.
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-zinc-600">
            <Loader2 className="h-8 w-8 animate-spin text-[#0071e3]" />
            <p>KI baut die App nach…</p>
            <p className="text-xs text-zinc-400">Das dauert ein paar Sekunden</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-sm font-medium text-zinc-900">KI-Übersetzung fehlgeschlagen</p>
            <p className="max-w-md text-xs text-zinc-600">{error}</p>
            <button
              onClick={translate}
              className="rounded bg-[#0071e3] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0060c0]"
            >
              Nochmal versuchen
            </button>
          </div>
        )}

        {!loading && !error && tab === "app" && (
          <iframe
            title="ai-app"
            src={iframeUrl}
            sandbox="allow-scripts allow-forms allow-pointer-lock allow-modals"
            className="h-full w-full border-0"
          />
        )}

        {!loading && !error && tab === "explain" && (
          <div className="h-full overflow-auto p-4 sm:p-6">
            <h3 className="mb-2 text-base font-semibold text-zinc-900">Was macht „{zipName}"?</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-700">{explanation}</p>
          </div>
        )}

        {!loading && !error && tab === "code" && <FilesWindow files={files} />}

        {!loading && !error && tab === "chat" && (
          <ChatPanel
            history={history}
            input={chatInput}
            onInput={setChatInput}
            onSend={sendChat}
            busy={chatBusy}
          />
        )}
      </div>
    </div>
  );
}

function ChatPanel({
  history,
  input,
  onInput,
  onSend,
  busy,
}: {
  history: Msg[];
  input: string;
  onInput: (s: string) => void;
  onSend: () => void;
  busy: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [history, busy]);

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto p-3 sm:p-4">
        {history.length === 0 && (
          <div className="mt-6 text-center text-xs text-zinc-500">
            <p className="mb-2">Frag die KI was zu der App.</p>
            <p className="text-zinc-400">z.B. „Mach den Button blau" oder „Erklär mir was im Code passiert"</p>
          </div>
        )}
        {history.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-[#0071e3] text-white"
                : "mr-auto bg-zinc-100 text-zinc-900"
            }`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {busy && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> denkt nach…
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex shrink-0 gap-2 border-t border-zinc-200 bg-white p-2"
      >
        <input
          value={input}
          onChange={(e) => onInput(e.target.value)}
          disabled={busy}
          placeholder="Frag was…"
          className="flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#0071e3] focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#0071e3] text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
