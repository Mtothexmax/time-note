# Known Issues & Bug Prevention

## 1. Day-Shift Bug (Date/Time Zone) - FIXED 2026-04-28
- **Risk area:** `formatDate()`, `DayHeader.svelte` `dateStr` — any use of `toISOString()` for date keys
- **Symptoms:** Events appear 1 day right (Friday → Saturday column)
- **Root cause:** `formatDate(date)` used `date.toISOString().split('T')[0]` which returns UTC date. In CEST (UTC+2), midnight local = 22:00 UTC previous day → `toISOString()` gives wrong date. CSV events used correct local date → mismatch.
- **Fix:** `formatDate()` now uses `getFullYear()/getMonth()/getDate()` (local time). `DayHeader.svelte` now imports and uses `formatDate()` instead of inline `toISOString()`.
- **Also fixed (2026-04-28 v2):** Rewrote CalendarGrid to use `$derived.by()` combining all event types per day + `diffDays()` utility for robust date-only comparison.

## 2. file:// Clipboard Restriction
- `navigator.clipboard.writeText()` throws when opened from `file://`
- **Fix:** textarea + `execCommand('copy')` fallback (implemented)
- **Note:** This only applies to the HTML prototyp; the SvelteKit dev server uses `http://`

## 3. Event ID Collision
- CSV event IDs are derived from Subject + Date + Time
- If the same meeting appears in two CSV imports, IDs will collide
- **Impact:** Booking numbers would overwrite each other
- **Watch for:** Duplicate events after re-import

## 4. localStorage Quota
- 5MB limit per origin
- CSV imports with many events + accumulated manual data could hit this
- **No overflow handling currently implemented**

## 5. Modal Z-Index vs Sticky Header
- Header has `z-index: 40`
- Modal uses `z-[100]` with `backdrop-blur-sm`
- Must keep modal z-index > 100 to stay above all grid content
- **Edge case:** Event cards have dynamic z-index up to 50

## 6. Empty States
- Store initializes with empty arrays/objects
- Falls `localStorage` null/undefined is → default values
- CSV with malformed rows → filtered out via `o.id` check
- Missing time values → `getGridRow` returns 0 → card not rendered (or hidden)

## 7. Svelte 5 Rune Reactivity
- `$state` objects must be re-assigned (not mutated) for reactivity in some cases
- `$effect` dependencies tracked automatically - must be careful with destructured access
- The store uses `$state` class fields - these are reactive in Svelte 5

## 8. Code Duplication Risk
- Similar clipboard logic exists in both `firstdraft.html` (JS function) and `DayHeader.svelte` (Svelte component)
- When fixing bugs, must fix in both places

## 9. Browser Compatibility
- `document.execCommand('copy')` deprecated but still supported in all browsers
- CSS `subgrid` not used (explicit grid-row/column instead)
- CSS `:has()` not required
