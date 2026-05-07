
<script lang="ts">
    import { getGridRow, getGridOffset, getPreciseHeight, getDurationMin, formatDur, stripSeconds } from '$lib/utils/dateUtils';
    import { Layers, FileJson, ClipboardPaste } from 'lucide-svelte';

    let {
        start,
        end,
        title,
        style,
        dayColumn,
        booking,
        zIndex = 10,
        overlapEvents = [] as { title: string; time: string; date: string; style: string; onClick: () => void }[],
        onclick,
        onOverlapMenu,
        onBookingPaste
    } = $props<{
        start: string;
        end: string;
        title: string;
        style: string;
        dayColumn: number;
        booking?: string;
        zIndex?: number;
        overlapEvents?: { title: string; time: string; date: string; style: string; onClick: () => void }[];
        onclick: () => void;
        onOverlapMenu?: (events: { title: string; time: string; date: string; style: string; onClick: () => void }[], x: number, y: number) => void;
        onBookingPaste?: (booking: string) => void;
    }>();

    const startRow   = $derived(getGridRow(start));
    const startOffset = $derived(getGridOffset(start));
    const rowSpan    = $derived(Math.max(1, Math.ceil((startOffset + Math.max(15, getDurationMin(start, end))) / 30)));
    const cardPx     = $derived(getPreciseHeight(start, end));
    const durationMin = $derived(getDurationMin(start, end));
    const durationDisplay = $derived(formatDur(durationMin));
    const hasOverlaps = $derived(overlapEvents.length > 0);

    let ctxMenu = $state<{ x: number; y: number } | null>(null);

    function openCtxMenu(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        ctxMenu = { x: e.clientX, y: e.clientY };
    }

    function closeCtxMenu() {
        ctxMenu = null;
    }

    function copyAsJSON() {
        const parts = (booking || '').split(';');
        const entry = {
            Dauer: formatDur(durationMin),
            Projekt: parts[0] || '',
            Vorgang: parts[1] || '',
            'Tätigkeit': parts[2] || '',
            Bemerkung: parts[3] || ''
        };
        navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
        closeCtxMenu();
    }

    async function pasteBooking() {
        try {
            const text = await navigator.clipboard.readText();
            const entry = JSON.parse(text);
            const newBooking = [
                entry.Projekt || '',
                entry.Vorgang || '',
                entry['Tätigkeit'] || '',
                entry.Bemerkung || ''
            ].join(';');
            onBookingPaste?.(newBooking);
        } catch {}
        closeCtxMenu();
    }

    function toggleMenu(e: MouseEvent) {
        e.stopPropagation();
        onOverlapMenu?.(overlapEvents, e.clientX, e.clientY);
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="event-card-wrapper"
    style="grid-column: {dayColumn + 2}; grid-row: {startRow} / span {rowSpan}; z-index: {zIndex}; max-height: {cardPx}px; margin-top: {startOffset}px;"
>
    <div class="event-card {style}" onclick={onclick} oncontextmenu={openCtxMenu} title="{stripSeconds(start)} - {stripSeconds(end)}">
        <div class="font-bold truncate uppercase text-[9px]">{title}</div>
        <div class="text-[8px] opacity-60">{durationDisplay}h</div>
        {#if booking}
            <div class="mt-auto font-mono text-[8px] px-1 rounded" style="background: rgba(255,255,255,0.4); color: inherit; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; width: 100%;">#{booking}</div>
        {/if}
    </div>

    {#if hasOverlaps}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="overlap-indicator" onclick={toggleMenu} role="button" tabindex="0">
            <Layers size={10} />
            <span class="overlap-count">{overlapEvents.length}</span>
        </div>
    {/if}

</div>

{#if ctxMenu}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-[9998]" onclick={closeCtxMenu}></div>
    <div
        class="fixed z-[9999] rounded-lg shadow-xl py-1 min-w-[180px]"
        style="top: {ctxMenu.y}px; left: {ctxMenu.x}px; background: var(--bg-card); border: 1px solid var(--border-main);"
    >
        <div class="px-2 py-1 text-[9px] font-black uppercase tracking-wider truncate max-w-[200px]" style="color: var(--text-muted)">{title}</div>
        <div style="border-top: 1px solid var(--border-main); margin: 2px 0;"></div>
        <button
            class="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors"
            style="color: var(--text-primary)"
            onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'}
            onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            onclick={copyAsJSON}
        >
            <FileJson size={11} /> Kopieren
        </button>
        <button
            class="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors"
            style="color: var(--text-primary)"
            onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'}
            onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            onclick={pasteBooking}
        >
            <ClipboardPaste size={11} /> Einfügen
        </button>
    </div>
{/if}

<style>
    .event-card-wrapper {
        position: relative;
        width: 80%;
        margin-left: auto;
        overflow: hidden;
    }
    .event-card {
        margin: 1px; border-radius: 4px; padding: 4px; font-size: 0.7rem; line-height: 1.1;
        cursor: pointer; border-left-width: 4px; overflow: hidden;
        display: flex; flex-direction: column;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        transition: transform 0.1s, box-shadow 0.1s;
        height: 100%;
        box-sizing: border-box;
        min-width: 0;
    }
    .event-card:hover { z-index: 50 !important; box-shadow: 0 4px 16px rgba(0,0,0,0.18); }

    .overlap-indicator {
        position: absolute;
        top: 2px;
        right: 2px;
        background: rgba(0,0,0,0.6);
        color: white;
        border-radius: 3px;
        padding: 1px 3px;
        display: flex;
        align-items: center;
        gap: 2px;
        cursor: pointer;
        z-index: 60;
        font-size: 8px;
        line-height: 1;
    }
    .overlap-indicator:hover {
        background: rgba(0,0,0,0.8);
    }
    .overlap-count {
        font-weight: 700;
    }

    :global(.card-csv) { border-left-color: var(--card-csv-border); border-left-width: 5px; background: var(--card-csv-bg); color: var(--card-csv-text); border-left-style: solid; }
    :global(.card-manual) { border-left-color: var(--card-manual-border); border-left-width: 5px; background: var(--card-manual-bg); color: var(--card-manual-text); border-left-style: solid; }
    :global(.card-booked) { border-left-color: var(--card-booked-border); border-left-width: 5px; background: var(--card-booked-bg); color: var(--card-booked-text); font-weight: 600; border-left-style: solid; }
    :global(.card-work) { border-left-color: var(--card-work-border); border-left-width: 5px; background: var(--card-work-bg); color: var(--card-work-text); border-left-style: dashed; }
    :global(.card-ooo) { opacity: 0.3; background: var(--card-ooo-bg); border-left-color: var(--card-ooo-border); border-left-style: solid; }
    :global(.card-pause) { border-left-color: var(--card-pause-border); border-left-width: 5px; background: var(--card-pause-bg); color: var(--card-pause-text); border-left-style: solid; }
</style>
