import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";

const BodySchema = z.object({
  zipName: z.string().max(200),
  appHtml: z.string().max(80_000),
  question: z.string().max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(20)
    .optional(),
});

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return Response.json({ error: "LOVABLE_API_KEY fehlt" }, { status: 500 });

          const body = BodySchema.parse(await request.json());
          const gateway = createLovableAiGatewayProvider(key, getLovableAiGatewayRunId(request));

          const messages = [
            ...(body.history ?? []),
            { role: "user" as const, content: body.question },
          ];

          const result = await generateText({
            model: gateway("google/gemini-2.5-flash"),
            system: `Du hilfst dem Nutzer mit einer nachgebauten Web-App aus der ZIP "${body.zipName}".

Aktueller HTML-Quelltext der App (gekürzt):
\`\`\`html
${body.appHtml.slice(0, 30_000)}
\`\`\`

Antworte kurz und konkret auf Deutsch. Wenn der Nutzer eine Code-Änderung will, gib einen kompletten neuen HTML-Block zurück, eingerahmt in \`\`\`html und \`\`\`. Sonst nur Erklärung.`,
            messages,
          });

          return Response.json({ reply: result.text });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
        }
      },
    },
  },
});
