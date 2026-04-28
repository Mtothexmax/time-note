Projekt-Prompt: Time-Note 2026
Ziel: Erstelle ein Single-File HTML-Tool zur Zeiterfassung, das Outlook-CSV-Exporte mit manuellen Einträgen kombiniert und für ein Buchungssystem (ZNR) aufbereitet.

1. Tech-Stack & Architektur
Technologie: Single HTML Datei, Vanilla JavaScript (ES6+), Tailwind CSS (CDN), Lucide Icons.

Storage: Vollständige Persistenz über localStorage (Events, Bookings, WorkData, ManualMeetings).

Kompatibilität: Muss lokal über das file:// Protokoll laufen (wichtig für Clipboard-Handling).

2. Kalender-Logik (Kritisch)
Grid: 24-Stunden-Grid (00:00 - 24:00 Uhr) in 30-Minuten-Schritten.

Wochenfokus: Montag als Wochenstart.

Datums-Handling: Absolute Vermeidung von UTC-Verschiebungen. Berechnungen müssen auf lokalen Zeit-Instanzen basieren, um "Day-Shift-Bugs" (Termine landen am falschen Tag) zu verhindern.

CSV-Parsing: Robuster Parser für Outlook-Kalender-CSVs (Spalten: "Subject", "Start Date", "Start Time", "End Time", "Show time as").

3. Datenmodelle & UI-Zustände
Kategorien & Farben:

CSV-Meetings: Emerald-Grün.

Manuelle Meetings: Teal-Grün.

Booked (ZNR vorhanden): Sky-Blau (Priorität über CSV/Manuell).

Präsenzzeit (Work): Indigo (gestrichelt im Hintergrund).

OOO (Out of Office): Ausgrauen (Deckkraft 0.3) und Filter-Option.

Überlappungen: Visuelle Stapelung (Stacking) von Karten, die zur gleichen Zeit stattfinden, damit alle klickbar bleiben.

4. Funktionale Features
Manueller Modus: Button zum Hinzufügen von Meetings, die nicht im Outlook-Kalender stehen.

Präsenz-Intervalle: Möglichkeit, pro Tag mehrere Arbeitszeit-Blöcke (z.B. Vormittag/Nachmittag) zu definieren.

Clipboard-Export (Das Kernfeature):

Berechnung der Netto-Arbeitszeit (Präsenz abzüglich Pausen/Meetings).

Rundungslogik: Alle Zeiten müssen für den Export auf 15 Minuten gerundet werden.

Format: HH:MM ZNR (Betreff).

Fallback-Mechanismus: Da navigator.clipboard bei lokalen Dateien oft blockiert wird, muss ein textarea-select-copy Fallback implementiert sein.

5. Bekannte Probleme (Bug-Prävention)
Z-Index: Modals müssen über dem klebrigen (sticky) Kalender-Header liegen.

Date-Parsing: CSV-Daten kommen oft im Format DD-MM-YYYY. Dieses muss sicher in YYYY-MM-DD für JS-Date-Objekte umgewandelt werden.

Empty States: Das Tool darf nicht abstürzen, wenn der LocalStorage leer ist oder eine CSV-Zeile korrupte Daten enthält.

Tipp für den nächsten Prompt: Wenn du das einem anderen LLM gibst, füge hinzu: "Bitte achte besonders auf die getMonday-Funktion und das lokale Datums-Parsing, da JS-Date-Objekte dazu neigen, Tage basierend auf der Systemzeit/UTC zu verschieben."

Soll ich dir noch ein kurzes Beispiel-Snippet für die Rundungslogik mitschicken, falls du die exportierten Zeiten noch feiner steuern willst?