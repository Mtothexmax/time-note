# Project: time-note (Time-Note 2026)

## Goal
Zeiterfassungs-Tool, das Outlook-CSV-Exporte mit manuellen Einträgen kombiniert und für ein Buchungssystem (ZNR) aufbereitet. Kernfeature: Täglicher Clipboard-Export mit 15-Minuten-Rundung.

## Repo Structure

```
/
├── firstdraft.html          // Single-File Vanilla JS Prototyp (läuft über file://)
├── requirements.md          // Anforderungsdokument
├── src/                     // SvelteKit 5 + Tailwind v4 Migration
│   ├── routes/
│   │   ├── +layout.svelte   // Root layout
│   │   ├── +page.svelte     // Main page - orchestrates components
│   │   └── layout.css       // Tailwind import + theme
│   └── lib/
│       ├── assets/          // Static assets (favicon etc.)
│       ├── components/      // Svelte components
│       ├── stores/          // calendarStore.ts - zentrale State-Verwaltung
│       └── utils/           // dateUtils.ts - date/time helpers
├── calendarFromGithub/calendar/  // Geklontes Svelte-Kalender-Package (v5.7.0)
│   └── packages/
│       ├── core/            // Core calendar logic
│       └── build/           // Build output
└── .deepseek/               // AI memory (this directory)
```

## Tech Stack
- **SvelteKit 5** (rune-based reactivity: `$state`, `$derived`, `$effect`)
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **lucide-svelte** (icons)
- **TypeScript**
- **Vite 8**

## Data Flow
- All state lives in `calendarStore.ts` (singleton class with Svelte 5 runes)
- Persistence: `localStorage` (keys: `wf_events`, `wf_bookings`, `wf_work`, `wf_manual`, `wf_hideOOO`)
- CSV import → parses Outlook format → stores in store → auto-save
- Clipboard export: `document.execCommand('copy')` mit textarea-Fallback (wegen file:// restriction)

## Dev Commands
```sh
npm run dev         # Start dev server
npm run build       # Build for production
npm run check       # Type check (svelte-check)
```
