# time-note

Zeiterfassungs-Tool mit Kalender-Grid. Läuft als reine Client-SPA (SvelteKit mit `@sveltejs/adapter-static`).

## Stack

- **Svelte 5** (runes mode: `$state`, `$derived`, `$effect`, `$props`)
- **SvelteKit 2** mit static adapter → deployed als GitHub Page
- **TypeScript**
- **Tailwind CSS 4**
- **lucide-svelte** (Icons)
- **@js-temporal/polyfill** (Temporal API für Datums-Arithmetik)

Alle Daten werden in `localStorage` persistiert (Keys: `wf_events`, `wf_bookings`, `wf_work`, `wf_manual`, `wf_bookingDict`, u.a.).

## Datenstruktur

Zentrale Datei: `src/lib/stores/calendarStore.svelte.ts` → Klasse `CalendarStore` mit:
- `events` — importierte Outlook-CSV-Termine (`CSVEvent[]`)
- `bookings` — manuelle Buchungsnummern pro Event-ID
- `bookingDict` — Subject → Buchungsnummer Mapping (Dictionary)
- `workData` — manuelle Arbeitszeit-Intervalle pro Datum (`WorkInterval[]`)
- `manualMeetings` — manuell angelegte Termine (`ManualMeeting[]`)

Buchungsnummern-Format: `Projekt;Vorgang;Tätigkeit;Bemerkung` (semicolon-separiert).

## Wichtige Komponenten

| Komponente | Zweck |
|---|---|
| `CalendarGrid.svelte` | Haupt-Kalender-Raster (Tage × Stunden) |
| `DayHeader.svelte` | Tageskopf mit Check-in/Check-out |
| `EventCard.svelte` | Termin-Block im Kalender (Context-Menü) |
| `TimeEntry.svelte` | Start/Ende-TimePicker + BookingFields |
| `TimePicker.svelte` | HH:MM-Auswahl-Dropdown |
| `BookingFields.svelte` | Grid mit Projekt/Vorgang/Tätigkeit/Bemerkung |
| `WorkModalContent.svelte` | Modal für Präsenzzeit (3-Spalten-Grid) |
| `DictModalContent.svelte` | Dictionary-Popup (3-Spalten-Grid) |
| `MeetingModalContent.svelte` | Termin bearbeiten Modal |
| `Modal.svelte` | Generisches Modal-Wrapper |
| `Header.svelte` | Kopfzeile mit Dictionary-Button |

## Commands

```sh
npm run dev      # Entwicklungsserver
npm run build    # Produktionsbuild
npm run check    # Type-Check (svelte-check)
.\export.ps1     # Build + Deploy nach docs/
```
