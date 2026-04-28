
<script lang="ts">
    import { getGridRow, getRowSpan, getDurationMin, formatDur, stripSeconds } from '$lib/utils/dateUtils';
    import { Layers } from 'lucide-svelte';

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
        onOverlapMenu
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
    }>();

    const startRow = $derived(getGridRow(start));
    const rowSpan = $derived(getRowSpan(start, end));
    const durationMin = $derived(getDurationMin(start, end));
    const durationDisplay = $derived(formatDur(durationMin));
    const hasOverlaps = $derived(overlapEvents.length > 1);

    function toggleMenu(e: MouseEvent) {
        e.stopPropagation();
        onOverlapMenu?.(overlapEvents, e.clientX, e.clientY);
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="event-card-wrapper"
    style="grid-column: {dayColumn + 2}; grid-row: {startRow} / span {rowSpan}; z-index: {zIndex}"
>
    <div class="event-card {style}" onclick={onclick} title="{stripSeconds(start)} - {stripSeconds(end)}">
        <div class="font-bold truncate uppercase text-[9px]">{title}</div>
        <div class="text-[8px] opacity-60">{durationDisplay}</div>
        {#if booking}
            <div class="mt-auto font-mono text-[8px] bg-white/40 px-1 rounded truncate">#{booking}</div>
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

<style>
    .event-card-wrapper {
        position: relative;
        width: 80%;
        margin-left: auto;
    }
    .event-card {
        margin: 1px; border-radius: 4px; padding: 4px; font-size: 0.7rem; line-height: 1.1;
        cursor: pointer; border-left-width: 4px; overflow: hidden;
        display: flex; flex-direction: column;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        transition: transform 0.1s, box-shadow 0.1s;
        height: 100%;
        box-sizing: border-box;
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
    .overlap-menu-header {
        padding: 6px 8px 4px;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        color: #94a3b8;
        letter-spacing: 0.05em;
    }
    .overlap-menu-item {
        display: flex;
        flex-direction: column;
        gap: 1px;
        width: 100%;
        padding: 6px 8px;
        border-radius: 6px;
        border: none;
        background: transparent;
        text-align: left;
        cursor: pointer;
        font-size: 10px;
    }
    .overlap-menu-item:hover {
        background: #f1f5f9;
    }
    .overlap-item-title {
        font-size: 10px;
        font-weight: 600;
    }
    .overlap-item-time {
        font-size: 9px;
        color: #64748b;
    }

    :global(.card-csv) { border-left-color: #059669; border-left-width: 5px; background: rgba(16,185,129,0.12); color: #047857; border-left-style: solid; }
    :global(.card-manual) { border-left-color: #0d9488; border-left-width: 5px; background: rgba(20,184,166,0.12); color: #115e59; border-left-style: solid; }
    :global(.card-booked) { border-left-color: #0284c7; border-left-width: 5px; background: rgba(14,165,233,0.12); color: #075985; font-weight: 600; border-left-style: solid; }
    :global(.card-work) { border-left-color: #4f46e5; border-left-width: 5px; background: rgba(99,102,241,0.10); color: #3730a3; border-left-style: dashed; }
    :global(.card-ooo) { opacity: 0.3; background: rgba(148,163,184,0.08); border-left-color: #94a3b8; border-left-style: solid; }
    :global(.card-pause) { border-left-color: #ea580c; border-left-width: 5px; background: rgba(251,146,60,0.12); color: #c2410c; border-left-style: solid; }
</style>
