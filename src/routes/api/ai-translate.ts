import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";

const BodySchema = z.object({
  zipName: z.string().max(200),
  files: z
    .array(
      z.object({
        path: z.string().max(500),
        content: z.string().max(60_000),
        truncated: z.boolean().optional(),
      }),
    )
    .max(40),
  binaryNames: z.array(z.string()).max(50).optional(),
});

const SYSTEM = `Du bist ein Übersetzer von beliebigem Quellcode in eine einzige, lauffähige HTML-Seite.

EINGABE: Eine ZIP mit Quellcode (Python, C/C++, Java, Rust, Go, JS, Shell, …) oder nur Binärdateien.

AUFGABE:
1. Verstehe was das Programm tut.
2. Baue eine vollständige interaktive HTML-Seite mit Tailwind (CDN) und vanilla JS, die dieselbe Funktion 1:1 nachbildet — Eingaben, Buttons, Ausgaben, Logik, alles.
3. Mach es schön: aufgeräumtes UI, sinnvolle Defaults, deutsche Beschriftungen.
4. Wenn nur eine .exe ohne Quellcode da ist: baue eine plausible Demo-Oberfläche basierend auf Name/Strings und kennzeichne sie klar als "Nachbau".

REGELN:
- Antworte mit EINEM kompletten HTML-Dokument: beginne mit <!doctype html>, ende mit </html>.
- Keine Markdown-Fences, keine Erklärung drumherum.
- Tailwind via <script src="https://cdn.tailwindcss.com"></script>.
- Komplette Logik in <script>-Tags inline.
- Keine externen Requests außer Tailwind.
- Stelle sicher, dass der erste Eindruck schon zeigt, was die App macht.`;

export const Route = createFileRoute("/api/ai-translate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const key = process.env.LOVABLE_API_KEY;
          if (!key) {
            return Response.json({ error: "LOVABLE_API_KEY fehlt" }, { status: 500 });
          }

          const json = await request.json();
          const body = BodySchema.parse(json);

          const fileBlock = body.files
            .map(
              (f) =>
                `===== FILE: ${f.path}${f.truncated ? " (gekürzt)" : ""} =====\n${f.content}`,
            )
            .join("\n\n");

          const binBlock = body.binaryNames?.length
            ? `\n\nBINÄRDATEIEN (kein Quellcode lesbar):\n${body.binaryNames.join("\n")}`
            : "";

          const userPrompt = `ZIP-Name: ${body.zipName}

Quelldateien:
${fileBlock}${binBlock}

Baue jetzt die HTML-Seite, die diese Anwendung darstellt.`;

          const gateway = createLovableAiGatewayProvider(key, getLovableAiGatewayRunId(request));

          // Run translation + explanation in parallel
          const [translateResult, explainResult] = await Promise.all([
            generateText({
              model: gateway("google/gemini-2.5-flash"),
              system: SYSTEM,
              prompt: userPrompt,
            }),
            generateText({
              model: gateway("google/gemini-2.5-flash"),
              system:
                "Erkläre einem Laien in 3-5 kurzen deutschen Sätzen, was das Programm in dieser ZIP tut. Sei konkret und hilfreich. Keine Markdown-Formatierung.",
              prompt: userPrompt,
            }),
          ]);

          let html = translateResult.text.trim();
          // Strip accidental fences
          html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
          if (!/<!doctype/i.test(html) && !/<html/i.test(html)) {
            html = `<!doctype html><html><head><meta charset="utf-8"><script src="https://cdn.tailwindcss.com"></script></head><body class="p-6 font-sans">${html}</body></html>`;
          }

          return Response.json({
            html,
            explanation: explainResult.text.trim(),
          });
        } catch (e: any) {
          const msg = e?.message ?? String(e);
          const status =
            /rate/i.test(msg) ? 429 : /credit|402/i.test(msg) ? 402 : 500;
          return Response.json({ error: msg }, { status });
        }
      },
    },
  },
});
