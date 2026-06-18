
# Zippy Executor — ZIP rein, läuft

## Ehrliche Vorab-Info (wichtig!)

Ein Browser kann **nicht alles** ausführen. Was geht und was nicht:

| Inhalt der ZIP | Geht im Browser? |
|---|---|
| HTML / CSS / JavaScript Web-App | **Ja**, läuft direkt — wie eine echte Webseite |
| Python-Skripte (.py) | **Ja**, über Pyodide (Python läuft im Browser als WebAssembly) |
| C / C++ Quellcode | Nur wenn als WebAssembly kompiliert — Rohcode nein |
| Java (.jar, .class) | Nein (kein Java im Browser) |
| .exe (Windows-Programm) | **Nein**, technisch unmöglich im Browser |
| .app (macOS-Programm) | **Nein**, technisch unmöglich im Browser |
| CSV / JSON / Bilder | Ja, werden angezeigt/visualisiert |

Zu deinem Punkt „Simulation = echtes Leben": Ja — wenn dein Python-Rechensystem oder deine HTML-App im Browser läuft und das richtige Ergebnis liefert, ist die Logik korrekt. Der **Code selbst** ist gleich, nur die Umgebung ist anders. Eine Formel rechnet im Browser exakt dasselbe wie auf einem Server.

Für `.exe`/`.app` müsste später eine **Desktop-Version** dazukommen (separates Projekt). Das Browser-Tool deckt aber 80% deiner Fälle ab (HTML, Python, Daten).

## Was ich baue

Eine einzige Seite (`/`) mit dieser User-Flow:

1. **Drop-Zone**: ZIP per Drag&Drop oder Klick hochladen
2. **Auto-Erkennung**: Tool entpackt die ZIP im Browser (mit `fflate`) und schaut rein:
   - Findet es `index.html` → startet die Web-App in einem isolierten iframe
   - Findet es `.py`-Dateien mit einer `main.py` oder einzelnem Skript → führt es mit Pyodide aus, zeigt Output
   - Findet es nur Daten (CSV/JSON/Bilder) → zeigt Vorschau/Tabelle
   - Findet es `.exe`/`.app`/`.jar` → erklärt freundlich, dass das nicht im Browser läuft, bietet Datei-Download an
3. **Ausgabe-Bereich**: Live-Ergebnis (iframe, Konsole, Tabelle)
4. **Dateibaum**: Übersicht aller Dateien in der ZIP mit Größe, klickbar für Vorschau

Alles lokal im Browser — deine ZIPs werden **nicht** hochgeladen.

## Technische Details

- **ZIP entpacken**: `fflate` (klein, schnell, läuft im Browser)
- **Python ausführen**: `pyodide` von CDN — lädt beim ersten Python-ZIP nach (~10MB einmalig)
- **Web-Apps**: `Blob`-URLs in sandboxed `<iframe>` mit `srcdoc`/`src` — Pfade zu CSS/JS/Bildern werden umgeschrieben, damit sie aus der ZIP statt vom Server kommen
- **UI**: TanStack Start (vorhanden), shadcn-Komponenten, Tailwind
- **Sicherheit**: iframe sandbox-Attribute begrenzen Zugriff; alles client-only

## Dateien

- `src/routes/index.tsx` — Hauptseite mit Drop-Zone, Dateibaum, Ausgabe-Panels
- `src/lib/zip-runner.ts` — entpackt ZIP, erkennt Typ
- `src/lib/runners/html-runner.tsx` — startet HTML-App im iframe (Pfad-Rewriting)
- `src/lib/runners/python-runner.tsx` — lädt Pyodide, führt .py aus, streamt stdout
- `src/lib/runners/data-viewer.tsx` — CSV/JSON/Bild-Vorschau
- `src/components/file-tree.tsx` — Datei-Übersicht
- `bun add fflate` — ZIP-Bibliothek

## Was später möglich wäre (nicht in diesem Schritt)

- Desktop-Version (Electron), die wirklich `.exe`/`.app`/Skripte am System ausführen kann — das ist ein eigener Build und ein separates Sicherheitsthema
- Mehr Python-Pakete (numpy, pandas etc. — Pyodide unterstützt vieles, aber nicht alles)

Sag Bescheid, ob ich so starten soll, oder ob dir der Desktop-Weg lieber ist (dann müssten wir das anders aufziehen).
