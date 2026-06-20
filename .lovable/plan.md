# Ziel

ZIP rein → sofort eine **fertige, interaktive Oberfläche**, die genau das macht, was das Programm in der ZIP tun würde — egal ob `.exe`, `.py`, `.c`, `.jar` oder Web-App. Wenn wir es nicht direkt ausführen können, **bauen wir es mit KI nach** und zeigen die echte Funktion, nicht nur den Code.

## Wie das funktioniert (3 Stufen, automatisch gewählt)

```text
ZIP rein
   │
   ▼
┌──────────────────────────────────┐
│ 1. Direkt ausführen (wenn geht)  │  HTML/JS, Python, Lua, SQLite, Wasm
└──────────────────────────────────┘
   │ geht nicht (z.B. .exe, .c, .jar)
   ▼
┌──────────────────────────────────┐
│ 2. KI liest Quellcode + baut UI  │  Lovable AI generiert React-Komponente
│    1:1 nach (oder besser)         │  die dasselbe macht
└──────────────────────────────────┘
   │ kein Quellcode da (nur .exe)
   ▼
┌──────────────────────────────────┐
│ 3. KI rät aus Name/Strings/Icons │  Erklärung + nachgebaute Demo-Oberfläche
│    + erklärt was es vermutlich tut│
└──────────────────────────────────┘
```

## Was der User sieht

Beim Drop einer ZIP öffnet sich **ein Fenster** mit Tabs:

1. **App** — die laufende Oberfläche (echt oder KI-nachgebaut)
2. **Was macht das?** — KI-Erklärung in einfachen Worten
3. **Code** — Originaldateien zum Durchstöbern
4. **KI-Chat** — „Mach den Button blau", „Erklär mir Zeile 42", „Bau einen Dark-Mode rein"

Bei der KI-nachgebauten Variante steht oben ein dezenter Hinweis: *„Nachgebaut aus dem Quellcode — kann an Details abweichen"*.

## Voraussetzung

**Lovable Cloud aktivieren** — wir brauchen den AI-Gateway, damit die KI-Übersetzung läuft. Das ist gratis im kostenlosen Kontingent. Kein Account-Setup, läuft sofort.

## Technische Details

### Neue Dateien
- `src/lib/ai/translate-zip.ts` — schickt ZIP-Inhalte an Lovable AI, bekommt fertige React-Komponente als String zurück
- `src/lib/ai/explain-zip.ts` — generiert die „Was macht das?"-Erklärung
- `src/lib/ai/sandbox-runner.ts` — führt den generierten React-Code sicher im iframe aus (Babel-Standalone für JSX im Browser)
- `src/components/desktop/AppWindow.tsx` — neuer Tab-Container (App / Erklärung / Code / Chat)
- `src/components/desktop/AiChat.tsx` — Chat-Panel mit Streaming
- `src/routes/api/public/ai-translate.ts` — Server-Route, ruft Lovable AI auf (Gemini 2.5 Flash, gratis bis 2026-10-13)

### Launcher-Erweiterung
`src/lib/launcher.ts` bekommt einen neuen Pfad: wenn Datei-Endung in `["exe","app","jar","c","cpp","rs","go","cs","swift","kt"]` ODER nichts direkt ausführbar ist → `kind: "ai-translated"`.

### Modell-Auswahl
- **Standard:** `google/gemini-2.5-flash` (gratis, schnell, gut genug für UI-Nachbau)
- **Bei großen Codebases:** `google/gemini-2.5-pro` (Premium-Modell für komplexere Logik)

### Sandbox
Generierter Code läuft in einem `<iframe sandbox="allow-scripts">` mit React + Tailwind via CDN — kein Zugriff auf das Hauptfenster, sicher gegen Schadcode aus fremden ZIPs.

### Was bleibt unverändert
- Mobile-Layout, macOS-Look, Fenster-System, Dock, alle bestehenden Engines (Python/SQLite/Lua/Wasm/HTML) — alles bleibt. Der KI-Pfad kommt **zusätzlich** für die Fälle, die vorher als „unsupported" gelandet sind.

## Was wir nicht versprechen können

- Eine echte `.exe` läuft nicht im Browser (technisch unmöglich ohne den Original-Compiler) — wir bauen die Funktion mit KI nach. Bei einfachen Tools (Taschenrechner, Texteditor, kleine Spiele) wird das praktisch identisch. Bei komplexer Software (Photoshop) eher eine Demo der Hauptfunktion + ehrliche Erklärung.
- Erste KI-Übersetzung dauert ~5-15 Sekunden, danach gecacht.

## Reihenfolge der Umsetzung

1. Lovable Cloud aktivieren
2. AI-Gateway-Server-Route + Translate/Explain-Funktionen
3. Sandbox-Runner für generierten React-Code
4. AppWindow mit Tabs einbauen
5. Launcher umstellen — alles Unbekannte geht zur KI
6. Auf Handy testen
