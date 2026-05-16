# Components

## State Store: `src/lib/stores/calendarStore.ts`
- Singleton class `CalendarStore` with Svelte 5 runes
- `$state` properties: events, bookings, workData, manualMeetings, currentWeekStart, hideOOO, hideWeekends (default true)
- `load()` / `save()` → localStorage
- `changeWeek(n)` / `goToToday()` → mutates `currentWeekStart`
- Imports from `$app/environment` for SSR guard

## Utils: `src/lib/utils/dateUtils.ts`
- `getMonday(d)` → Monday of week (local time, `setHours(12)` then `setHours(0)` trick)
- `formatDate(d)` → `YYYY-MM-DD`
- `getDurationMin(s, e)` → minutes between two `HH:MM` strings
- `formatDur(min)` → `H:MM` string
- `roundTo15(min)` → rounds to nearest 15
- `toMinutes(time)` → minutes since midnight from `HH:MM` string
- `getGridRow(time)` → CSS grid row number (30min slots)
- `getRowSpan(start, end)` → number of grid rows to span
- `diffDays(a, b)` → integer day diff using `Date.UTC` (ignores time, avoids DST bugs)
- `computeOverlaps(slots)` → overlap detection: given array of `{id, startMin, endMin}`, returns `Map<id, {zIndex, overlapIds[]}>`. Shorter events get higher z-index within each overlap group.

## Components (src/lib/components/)

### `Header.svelte`
- Navigation (prev/next week, today button)
- CSV upload (hidden input → label styling)
- Clear all button (with confirm dialog)
- OOO hide checkbox
- Displays current week date string

### `CalendarGrid.svelte`
- Main grid: 80px time column + 5/7 day columns, 48 half-hour rows (all 24h rendered)
- **Scroll container**: Grid wrapped in `overflow-y-auto` div with `max-height: 780px`. On mount, scrolls to 07:00 position (`scrollTop = 480`) to account for ~60px sticky header overlap, so 08:00 is fully visible. User scrolls up/down to see other hours (Outlook-like behavior)
- Renders DayHeaders + grid cells, then a single `#each renderedEvents` loop
- **Combined event rendering**: Uses `$derived.by()` to build a `RenderEvent[]` list per day column, merging work/manual/CSV events into one array
- **Overlap detection**: Calls `computeOverlaps()` per day column to group overlapping events and assign z-index (shorter = higher z-index)
- **Key fix**: Uses `diffDays()` for CSV date column calculation (was `Math.round` with noon vs midnight offset, causing day-shift bug)
- Receives callbacks: `onOpenMeeting`, `onOpenWork`, `onOpenManual`
- Type `RenderEvent` = `{ id, start, end, title, style, dayColumn, booking?, onClick, zIndex, overlapEvents[] }`

### `DayHeader.svelte`
- Sticky header per day column
- Three action buttons: Copy (clipboard export), Add Manual (calendar-plus icon), Add Work (plus icon)
- Copy logic: combines CSV + manual events with booking, computes remaining work time, rounds to 15min
- Uses textarea fallback for clipboard (works with file://)

### `EventCard.svelte`
- Positioned card on the calendar grid
- Props: start, end, title, style, dayColumn, booking?, zIndex?, overlapEvents?, onclick
- `zIndex` overrides default z-index 10 (used for overlap stacking)
- `overlapEvents` = `{ title, time, onClick }[]` — if length > 1, shows a **Layers icon badge** (top-right). Clicking badge toggles a **dropdown context menu** listing all overlapping events. Menu items call the event's onClick.
- Backdrop click closes menu
- Wrapped in `.event-card-wrapper` (position relative) to allow menu positioning without `overflow: hidden` conflict
- Styles: `.card-csv` (emerald), `.card-manual` (teal), `.card-booked` (sky blue), `.card-work` (indigo dashed), `.card-ooo` (gray 30% opacity), `.card-pause` (orange)

### `Modal.svelte`
- Generic modal wrapper with backdrop blur, fade/scale transitions
- Escape key closes, click-outside closes (via backdrop click)
- Props: isOpen, title, onClose, children

### `MeetingModalContent.svelte`
- Edits CSV meeting booking number OR creates/edits manual meeting
- Manual mode: start/end time inputs, subject input
- CSV mode: shows time range info
- Both: booking number (ZNR) input
- Optional delete button for manual meetings
- Save button calls `onSave(localData)`

### `WorkModalContent.svelte`
- Manages work intervals per day (start/end time + ZNR per row)
- Add/remove intervals dynamically
- Save button calls `onSave(intervals)`

## Page: `src/routes/+page.svelte`
- Orchestrates Header + CalendarGrid + Modals
- Holds modal state ($state objects)
- Implements open/save/delete handler functions
