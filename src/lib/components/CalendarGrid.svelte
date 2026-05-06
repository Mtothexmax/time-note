
<script lang="ts">
    import { onMount } from 'svelte';
    import { calendarStore } from '$lib/stores/calendarStore.svelte';
    import DayHeader from './DayHeader.svelte';
    import EventCard from './EventCard.svelte';
    import { formatDate, diffDays, toMinutes, computeOverlaps, getDurationMin, stripSeconds, csvDateToISO } from '$lib/utils/dateUtils';

    let { onOpenMeeting, onOpenWork, onOpenManual, onOverlapMenu } = $props<{
        onOpenMeeting: (ev: any) => void;
        onOpenWork: (dateStr: string) => void;
        onOpenManual: (dateStr: string, mId?: string, startTime?: string, endTime?: string) => void;
        onOverlapMenu?: (events: any[], x: number, y: number) => void;
    }>();

    const days = $derived.by(() => {
        const all = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(calendarStore.currentWeekStart);
            d.setDate(d.getDate() + i);
            return d;
        });
        if (calendarStore.hideWeekends) return all.slice(0, 5);
        return all;
    });

    const dayCount = $derived(days.length);

    let scrollContainer: HTMLDivElement;
    let gridEl: HTMLDivElement;
    let now = $state(new Date());
    let cursorReady = $state(false);

    $effect(() => {
        now = new Date();
        cursorReady = true;
        const id = setInterval(() => now = new Date(), 60000);
        return () => clearInterval(id);
    });

    const nowRow = $derived.by(() => {
        const h = now.getHours(), m = now.getMinutes();
        return h * 2 + 2 + m / 30;
    });
    const nowSlot = $derived(Math.floor(nowRow));
    const nowOffsetPx = $derived((nowRow - nowSlot) * 30);
    const nowVisible = $derived(cursorReady && nowRow >= 2 && nowRow <= 49);
    const todayStr = $derived(formatDate(new Date()));
    const todayCol = $derived(days.findIndex(d => formatDate(d) === todayStr));

    let hoverCol = $state(-1);
    let hoverRow = $state(2);
    let hoverVisible = $state(false);

    function formatGridTime(row: number): string {
        const slot = row - 2;
        const h = Math.floor(slot / 2);
        const m = slot % 2 === 0 ? '00' : '30';
        return `${String(h).padStart(2, '0')}:${m}`;
    }

    function onGridPointerMove(e: PointerEvent) {
        if (!gridEl || !scrollContainer) return;

        const target = e.target as HTMLElement;
        if (target.closest('.event-card-wrapper, .day-header, .overlap-indicator, .overlap-menu, .overlap-backdrop')) {
            hoverVisible = false;
            return;
        }

        const rect = gridEl.getBoundingClientRect();
        const tCol = 30;
        const colW = (rect.width - tCol) / dayCount;
        const col = Math.floor(((e.clientX - rect.left) - tCol) / colW);
        if (col < 0 || col >= dayCount) { hoverVisible = false; return; }

        const y = e.clientY - rect.top;
        const row = Math.floor((y - 60) / 30) + 2;
        if (row < 2 || row > 48) { hoverVisible = false; return; }

        hoverCol = col;
        hoverRow = row;
        hoverVisible = true;
    }

    function onGridPointerLeave() {
        hoverVisible = false;
    }

    function onGhostClick() {
        if (hoverCol < 0) return;
        const startTime = formatGridTime(hoverRow);
        const endTime = formatGridTime(hoverRow + 2);
        const dStr = formatDate(days[hoverCol]);
        onOpenManual(dStr, undefined, startTime, endTime);
    }

    onMount(() => {
        requestAnimationFrame(() => {
            if (!scrollContainer) return;
            const h = now.getHours(), m = now.getMinutes();
            const cursorRow = h * 2 + 2 + m / 30;
            scrollContainer.scrollTop = Math.max(420, (cursorRow - 2) * 30 - 300);
        });
    });

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const halfHours = ['00', '30'];

    function isOOO(subject: string, showTimeAs?: string) {
        if (showTimeAs === "4") return true;
        const s = subject.toLowerCase();
        return s.includes('out of office') || s.includes('ooo');
    }

    function isPause(subject: string) {
        return subject.toLowerCase().includes("pause");
    }

    type RenderEvent = {
        id: string;
        start: string;
        end: string;
        title: string;
        style: string;
        dayColumn: number;
        booking?: string;
        onClick: () => void;
        onBookingPaste: (b: string) => void;
        zIndex: number;
        overlapEvents: { title: string; time: string; date: string; style: string; onClick: () => void }[];
    };

    const renderedEvents = $derived.by(() => {
        const result: RenderEvent[] = [];

        for (let i = 0; i < days.length; i++) {
            const d = days[i];
            const dStr = formatDate(d);
            const slots: { id: string; startMin: number; endMin: number }[] = [];
            const eventMap = new Map<string, { start: string; end: string; title: string; style: string; booking?: string; onClick: () => void; onBookingPaste: (b: string) => void }>();

            // Work blocks
            (calendarStore.workData[dStr] || []).forEach((w, wi) => {
                const id = `work-${dStr}-${wi}`;
                const sm = toMinutes(w.start), em = toMinutes(w.end);
                if (!isNaN(sm) && !isNaN(em)) {
                    slots.push({ id, startMin: sm, endMin: em });
                    eventMap.set(id, { start: w.start, end: w.end, title: `ARBEIT: ${w.booking || '?'}`, style: 'card-work', onClick: () => onOpenWork(dStr), onBookingPaste: () => {} });
                }
            });

            // Manual meetings
            (calendarStore.manualMeetings[dStr] || []).forEach((m) => {
                const isManualOOO = m.subject.toLowerCase().includes('out of office');
                if (isManualOOO && calendarStore.hideOOO) return;
                const id = `manual-${m.id}`;
                const sm = toMinutes(m.start), em = toMinutes(m.end);
                if (!isNaN(sm) && !isNaN(em)) {
                    slots.push({ id, startMin: sm, endMin: em });
                    const style = isManualOOO ? 'card-ooo' : (m.booking ? 'card-booked' : 'card-manual');
                    eventMap.set(id, { start: m.start, end: m.end, title: m.subject, style, booking: m.booking, onClick: () => onOpenManual(dStr, m.id), onBookingPaste: (b: string) => { const meet = calendarStore.manualMeetings[dStr]?.find(x => x.id === m.id); if (meet) { meet.booking = b; calendarStore.save(); calendarStore.dispatchDayEvent(dStr); } } });
                }
            });

            // CSV events (only if they fall on this day)
            calendarStore.events.forEach(ev => {

                const evDateStr = csvDateToISO(ev["Start Date"]);
                if (evDateStr !== dStr) return;
                if (isOOO(ev.Subject, ev["Show time as"]) && calendarStore.hideOOO) return;

                const id = `csv-${ev.id}`;
                const sm = toMinutes(ev["Start Time"]), em = toMinutes(ev["End Time"]);
                if (!isNaN(sm) && !isNaN(em)) {
                    slots.push({ id, startMin: sm, endMin: em });
                    const dictBooking = calendarStore.bookingDict[ev.Subject];
                    const manualBooking = calendarStore.bookings[ev.id];
                    const effectiveBooking = dictBooking || manualBooking || '';
                    const hasZNR = !!effectiveBooking;
                    const ooo = isOOO(ev.Subject, ev["Show time as"]);
                    const style = ooo ? 'card-ooo' : (isPause(ev.Subject) ? 'card-pause' : (hasZNR ? 'card-booked' : 'card-csv'));
                    eventMap.set(id, { start: ev["Start Time"], end: ev["End Time"], title: ev.Subject, style, booking: effectiveBooking, onClick: () => onOpenMeeting(ev), onBookingPaste: (b: string) => { calendarStore.bookings[ev.id] = b; calendarStore.save(); calendarStore.dispatchDayEvent(dStr); } });
                }
            });

            // Detect overlaps
            const overlapInfo = computeOverlaps(slots);

            // Build RenderEvents for this day
            for (const slot of slots) {
                const info = eventMap.get(slot.id)!;
                const ov = overlapInfo.get(slot.id);
                const zIndex = ov?.zIndex ?? 10;

                let overlapEvents: { title: string; time: string; date: string; style: string; onClick: () => void }[] = [];
                if (ov && ov.overlapIds.length > 1) {
                    const dateParts = dStr.split('-');
                    const displayDate = `${dateParts[2]}.${dateParts[1]}.`;
                    const slotDur = slot.endMin - slot.startMin;
                    const belowIds = ov.overlapIds.filter(oid => {
                        if (oid === slot.id) return false;
                        const s = slots.find(s => s.id === oid)!;
                        return (s.endMin - s.startMin) > slotDur;
                    });
                    overlapEvents = belowIds.map(oid => {
                        const s = slots.find(s => s.id === oid)!;
                        const e = eventMap.get(oid)!;
                        return { title: e.title, time: `${stripSeconds(e.start)}-${stripSeconds(e.end)}`, date: displayDate, style: e.style, onClick: e.onClick };
                    });
                }

                result.push({
                    id: slot.id,
                    start: info.start,
                    end: info.end,
                    title: info.title,
                    style: info.style,
                    dayColumn: i,
                    booking: info.booking,
                    onClick: info.onClick,
                    onBookingPaste: info.onBookingPaste,
                    zIndex,
                    overlapEvents,
                });
            }
        }

        return result;
    });
</script>

<div class="rounded-2xl shadow-xl overflow-hidden" style="background: var(--bg-card); border-color: var(--border-main); flex: 1; min-height: 0;">
    <div bind:this={scrollContainer} class="overflow-y-auto" style="height: 100%; background: var(--bg-scroll)">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
            bind:this={gridEl}
            class="calendar-grid" 
            style="grid-template-columns: 30px repeat({dayCount}, 1fr)"
            onpointermove={onGridPointerMove}
            onpointerleave={onGridPointerLeave}
        >
            <div class="grid-cell" style="background: var(--bg-header)"></div>

            {#each days as day, i}
                <DayHeader 
                    date={day} 
                    dayIndex={i} 
                    onAddManual={(d) => onOpenManual(d)} 
                    onAddWork={onOpenWork} 
                />
            {/each}

            {#each hours as h}
                {#each halfHours as m}
                    {@const labelRow = h * 2 + (m === '30' ? 3 : 2)}
                    {@const cellOff = h < 7 || h >= 20}
                    {@const labelOff = h < 7 || h > 20}
                    <div class="time-label" class:off-hour={labelOff} style="grid-row: {labelRow}; {m === '30' ? 'visibility: hidden' : ''}">
                        {h}
                    </div>
                    {#each days as _, i}
                        <div 
                            class="grid-cell" class:off-hour={cellOff} class:half-hour={m === '30'}
                            style="grid-row: {labelRow}; grid-column: {i + 2}"
                        ></div>
                    {/each}
                {/each}
            {/each}

            {#each renderedEvents as ev (ev.id)}
                <EventCard
                    start={ev.start}
                    end={ev.end}
                    title={ev.title}
                    style={ev.style}
                    dayColumn={ev.dayColumn}
                    booking={ev.booking}
                    zIndex={ev.zIndex}
                    overlapEvents={ev.overlapEvents}
                    onclick={ev.onClick}
                    onBookingPaste={ev.onBookingPaste}
                    {onOverlapMenu}
                />
            {/each}

            {#if hoverVisible && hoverCol >= 0}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                    class="ghost-slot"
                    style="grid-column: {hoverCol + 2}; grid-row: {hoverRow} / span 2;"
                    onclick={onGhostClick}
                    role="button"
                    tabindex="-1"
                >
                    <div class="ghost-content">
                        <span class="ghost-plus">+</span>
                        <span class="ghost-time">{formatGridTime(hoverRow)}–{formatGridTime(hoverRow + 2)}</span>
                    </div>
                </div>
            {/if}

            {#if nowVisible}
                <div class="now-cursor" style="grid-column: 2 / span {dayCount}; grid-row: {nowSlot} / span 1; transform: translateY({nowOffsetPx}px)"></div>
                <div class="now-dot" style="grid-row: {nowSlot}; transform: translateY({nowOffsetPx}px)"></div>
            {/if}

            {#if todayCol >= 0}
                {#if todayCol > 0}
                    <div class="day-overlay" style="grid-column: 2 / span {todayCol}; grid-row: 2 / span 48;"></div>
                {/if}
                {#if todayCol < dayCount - 1}
                    <div class="day-overlay" style="grid-column: {todayCol + 3} / span {dayCount - todayCol - 1}; grid-row: 2 / span 48;"></div>
                {/if}
            {/if}
        </div>
    </div>
</div>

<style>
    .calendar-grid {
        display: grid;
        grid-template-rows: 60px repeat(48, 30px);
        position: relative;
    }
    .time-label { 
        grid-column: 1; 
        text-align: center; 
        padding-right: 0;
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1;
        margin-top: -6px;
        color: var(--text-muted); 
        display: flex; 
        align-items: flex-start; 
        justify-content: flex-end; 
    }
    .grid-cell { 
        border-right: 1px solid var(--grid-line-light); 
        border-top: 1px solid var(--grid-line); 
    }
    @media (prefers-color-scheme: dark) {
        .grid-cell { border-top: 1px solid #000 !important; border-right: 1px solid #000 !important; }
    }
    .off-hour {
        background: rgba(0,0,0,0.035);
    }
    @media (prefers-color-scheme: dark) {
        .off-hour { background: rgba(0,0,0,0.15); }
    }
    .half-hour {
        border-top-color: rgba(128,128,128,0.15);
    }
    @media (prefers-color-scheme: dark) {
        .half-hour { border-top-color: rgba(0,0,0,0.15) !important; }
    }
    .day-overlay {
        z-index: 100;
        pointer-events: none;
        background: rgba(0,0,0,0.1);
    }
    @media (prefers-color-scheme: dark) {
        .day-overlay { background: rgba(0,0,0,0.5); }
    }
    @media (prefers-color-scheme: dark) {
        .day-overlay { background: rgba(0,0,0,0.5); }
    }
    .time-label.off-hour {
        background: transparent;
        color: var(--text-muted);
        opacity: 0.35;
    }
    .now-cursor {
        z-index: 8;
        border-top: 2px solid #ef4444;
        pointer-events: none;
    }
    .now-dot {
        grid-column: 1;
        z-index: 8;
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        padding-right: 2px;
        pointer-events: none;
    }
    .now-dot::after {
        content: '';
        display: block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #ef4444;
        margin-top: -4px;
        margin-right: -1px;
    }
    @media (prefers-color-scheme: dark) {
        .now-cursor { border-top-color: #f87171; }
        .now-dot::after { background: #f87171; }
    }
    .ghost-slot {
        z-index: 5;
        border: 2px dashed var(--ghost-border);
        border-radius: 4px;
        background: var(--ghost-bg);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.1s;
    }
    .ghost-slot:hover {
        background: var(--ghost-bg-hover);
        border-color: var(--border-indigo);
    }
    .ghost-content {
        display: flex;
        align-items: center;
        gap: 4px;
        pointer-events: none;
    }
    .ghost-plus {
        font-size: 14px;
        font-weight: 800;
        color: var(--text-indigo-light);
        line-height: 1;
    }
    .ghost-time {
        font-size: 9px;
        font-weight: 700;
        color: var(--text-indigo-light);
        white-space: nowrap;
    }
</style>
