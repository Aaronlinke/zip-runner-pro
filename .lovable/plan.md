# ZIP-Runner als macOS-Style Desktop

## Was du bekommst

Eine Browser-Oberfläche, die aussieht und sich anfühlt wie ein echtes Betriebssystem:

- **Menüleiste oben** (wie macOS): Logo, App-Name, Uhrzeit, Status der Engines
- **Desktop-Hintergrund** mit weichem Verlauf (`#f5f5f7` → weiß)
- **Drop-Zone in der Mitte**: ZIP irgendwo aufs Fenster ziehen → wird automatisch "geöffnet"
- **Dock unten**: Icons für die laufenden Engines (Python, SQLite, C/Wasm, JS) – leuchten wenn aktiv
- **Fenster-System**: Jede gestartete ZIP öffnet sich als eigenes Fenster mit Ampel-Buttons (rot/gelb/grün), verschiebbar, minimierbar, maximierbar
- **Vernünftig benutzbar**: Wenn die ZIP eine Web-App ist, läuft sie direkt im Fenster. Wenn es Python ist, gibt's eine echte Konsole mit Eingabezeile. CSV/JSON → Tabelle. Bild → Viewer. Alles ohne dass du wissen musst, was drin ist.

## Engines, die im Hintergrund mitlaufen

Alle laden lazy beim ersten Bedarf, Status sichtbar im Dock:

| Engine | Wofür | Wie |
|---|---|---|
| **Python** (Pyodide) | `.py` Skripte inkl. numpy, pandas, matplotlib | schon drin, ausbauen |
| **SQLite** (sql.js) | `.db`, `.sqlite` Dateien öffnen + abfragen | sql.js via CDN |
| **JavaScript/TypeScript** | `.js`, `.ts` Skripte in sicherer Sandbox laufen lassen | QuickJS-Wasm oder iframe-Worker |
| **Lua** (wasmoon) | `.lua` Skripte | wasmoon via CDN |
| **C/C++** (Wasm) | vorkompilierte `.wasm` direkt starten; rohen `.c` Quellcode-Hinweis | WebAssembly nativ |
| **HTML/CSS/JS Web-App** | komplette Webseiten in ZIPs | schon drin (Blob-URLs + iframe) |
| **Daten** (CSV/JSON/Bilder/PDF/Audio/Video) | Anzeigen in passendem Viewer | native + papaparse |
| **Markdown/Text** | Lesen mit Syntax-Highlight | marked + shiki |

Java (.jar) und echte `.exe`/`.app` gehen im Browser physikalisch nicht – dafür kommt klar lesbar ein „Dafür brauchst du die Desktop-Version"-Hinweis im Fenster, kein stiller Fehler.

## Wie sich's anfühlt

- Beim Drop fliegt das ZIP-Icon zum Dock, "entpackt" sich mit kurzer Animation, dann ploppt das App-Fenster auf
- Mehrere ZIPs gleichzeitig offen → mehrere Fenster, jedes unabhängig
- Fenster-Chrome: Frosted-Glass (`backdrop-blur`), abgerundete Ecken, weiche Schatten
- SF-Pro-ähnliche Systemschrift (Inter als Fallback)
- Akzentfarbe `#0071e3` (macOS-Blau), Text `#1d1d1f`
- Keyboard: ⌘W schließt Fenster, ⌘M minimiert

## Technische Punkte (nur für Neugierige)

- **Kein Speichern**: Jede Session frisch, wie gewünscht
- **Engines lazy laden**: Erst beim ersten ZIP der entsprechenden Art, damit der Start schnell bleibt
- **Web Worker** für Python/SQL, damit die UI nicht einfriert
- **Iframe-Sandbox** mit strikten Permissions für Web-Apps – Sicherheit
- Neue Dateien: `src/components/desktop/{MenuBar,Dock,Window,DropZone}.tsx`, `src/lib/engines/{sqlite,lua,js-sandbox}.ts`, `src/lib/window-manager.ts` (Zustand für offene Fenster)
- `src/routes/index.tsx` wird zur Desktop-Shell umgebaut
- Pakete: `fflate` (da), `sql.js`, `wasmoon`, `papaparse`, `marked`, `zustand` für Fenster-State

## Was ich NICHT mache

- Keine echten `.exe`/`.app`/`.jar` ausführen (geht im Browser nicht)
- Kein dauerhaftes Speichern von ZIPs (du hast „jedes Mal neu" gewählt)
- Keine Backend/Server-Logik – alles läuft lokal in deinem Browser

Sag "Los" und ich baue das.
