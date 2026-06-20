import type { ZipFile } from "@/lib/zip-runner";
import { textOf } from "@/lib/zip-runner";

const TEXT_EXT = /\.(py|c|cpp|cc|h|hpp|rs|go|cs|swift|kt|java|js|mjs|ts|tsx|jsx|html|css|json|yaml|yml|toml|md|txt|sh|bash|rb|php|lua|sql|xml|ini|cfg)$/i;
const BINARY_HINT = /\.(exe|msi|app|dmg|jar|class|deb|rpm|bin|so|dll|dylib|wasm|png|jpg|jpeg|gif|webp|mp3|mp4|wav|ogg|zip|7z|tar|gz|pdf)$/i;

const MAX_FILES = 30;
const MAX_FILE_CHARS = 40_000;
const MAX_TOTAL_CHARS = 200_000;

export type TranslateResult = { html: string; explanation: string };

export async function aiTranslateZip(
  zipName: string,
  files: ZipFile[],
): Promise<TranslateResult> {
  // Pick text files, sort by likely-importance (smaller paths first, main.* first)
  const candidates = files
    .filter((f) => TEXT_EXT.test(f.name) && f.size < 500_000)
    .sort((a, b) => {
      const aMain = /(?:^|\/)(main|index|app)\.[a-z]+$/i.test(a.path) ? 0 : 1;
      const bMain = /(?:^|\/)(main|index|app)\.[a-z]+$/i.test(b.path) ? 0 : 1;
      if (aMain !== bMain) return aMain - bMain;
      return a.path.split("/").length - b.path.split("/").length;
    })
    .slice(0, MAX_FILES);

  let total = 0;
  const slim = candidates
    .map((f) => {
      const full = textOf(f);
      const truncated = full.length > MAX_FILE_CHARS;
      const content = truncated ? full.slice(0, MAX_FILE_CHARS) : full;
      if (total + content.length > MAX_TOTAL_CHARS) return null;
      total += content.length;
      return { path: f.path, content, truncated };
    })
    .filter(Boolean) as { path: string; content: string; truncated: boolean }[];

  const binaryNames = files.filter((f) => BINARY_HINT.test(f.name)).map((f) => f.path).slice(0, 30);

  const res = await fetch("/api/ai-translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zipName, files: slim, binaryNames }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as TranslateResult;
}

export async function aiChat(args: {
  zipName: string;
  appHtml: string;
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const res = await fetch("/api/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Fehler" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const j = await res.json();
  return j.reply as string;
}
