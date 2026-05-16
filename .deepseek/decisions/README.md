# Key Design Decisions

## 1. localStorage for Persistence
- All data stored in localStorage under `wf_*` keys
- No backend, no API - fully client-side
- Works offline, survives page refreshes
- *Trade-off:* 5MB limit, no cross-device sync

## 2. Single-File Prototype → SvelteKit Migration
- `firstdraft.html` is the original Vanilla JS prototype
- `src/` contains the SvelteKit 5 rewrite with same logic but proper component structure
- The HTML prototype may have bugs that need fixing; the Svelte version is the "real" app

## 3. Clipboard Fallback (document.execCommand)
- `navigator.clipboard` blockiert bei `file://` Protokoll
- Lösung: `<textarea>` erzeugen → select → `document.execCommand('copy')` → entfernen
- Von Apple-Support-Thread übernommen, funktioniert zuverlässig

## 4. getMonday Date Handling
- Kritisch: UTC-Verschiebungen vermeiden!
- `setHours(12)` → `getDay()` → Bereinigung → `setHours(0,0,0,0)`
- Vermeidet den "Day-Shift-Bug" durch lokale Zeitberechnung

## 5. CSV Parsing
- Outlook exportiert mit `","`-delimited quoted values
- Split by `","` instead of comma to avoid splitting on commas in subjects
- Date format from CSV: `DD-MM-YYYY` → converted to `YYYY-MM-DD` for comparison
- Event ID generated deterministically: `ev-${Subject}-${Date}-${Time}` → sanitized

## 6. 15-Minute Rounding for Export
- Required by the ZNR booking system
- `Math.round(dur / 15) * 15`
- Netto-Arbeitszeit = Präsenzzeit - Pausen - gebuchte Meetings
- Remaining minutes → work ZNR line

## 7. Event Layering Order in Grid
- Work blocks rendered first (bottom layer, dashed borders)
- Manual meetings rendered next
- CSV meetings on top
- nth-child stacking for overlapping events (margin-left offset)
- hover brings card to z-index 50

## 8. Tailwind v4 @theme
- Custom font-family via `@theme` directive instead of `tailwind.config`
- No PostCSS config needed (Tailwind v4 is a Vite plugin)
