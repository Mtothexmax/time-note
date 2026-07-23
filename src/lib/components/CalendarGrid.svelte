
<script lang="ts">
    import { onMount } from 'svelte';
    import { calendarStore, getDictBooking, type WorkInterval, type DurationItem } from '$lib/stores/calendarStore.svelte';
    import DayHeader from './DayHeader.svelte';
    import EventCard from './EventCard.svelte';
    import { CalendarPlus, Coffee, PlaneTakeoff } from 'lucide-svelte';
    import { formatDate, diffDays, toMinutes, computeOverlaps, getDurationMin, stripSeconds, csvDateToISO } from '$lib/utils/dateUtils';

    let { onOpenMeeting, onOpenWork, onOpenManual, onOverlapMenu } = $props<{
        onOpenMeeting: (ev: any) => void;
        onOpenWork: (dateStr: string) => void;
        onOpenManual: (dateStr: string, mId?: string, startTime?: string, endTime?: string, subject?: string) => void;
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
    let todayStr = $state('');

    $effect(() => {
        todayStr = formatDate(new Date());
    });
    const todayCol = $derived(days.findIndex(d => formatDate(d) === todayStr));
    const colTemplate = $derived.by(() => {
        if (todayCol < 0) return `30px repeat(${dayCount}, 1fr)`;
        const cols = days.map((_, i) => i === todayCol ? '1.5fr' : '0.9fr');
        return `30px ${cols.join(' ')}`;
    });

    let hoverCol = $state(-1);
    let hoverRow = $state(2);
    let hoverVisible = $state(false);

    function formatGridTime(row: number): string {
        const slot = row - 2;
        const h = Math.floor(slot / 2);
        const m = slot % 2 === 0 ? '00' : '30';
        return `${String(h).padStart(2, '0')}:${m}`;
    }

    let hoverPending = false;
    let hoverLastCol = -1;
    let hoverLastRow = -1;

    function onGridPointerMove(e: PointerEvent) {
        if (!gridEl || !scrollContainer) return;
        if (hoverPending) return;
        hoverPending = true;
        requestAnimationFrame(() => { hoverPending = false; });

        const target = e.target as HTMLElement;
        if (target.closest('.ghost-slot, .ghost-content, .ghost-plus, .ghost-time')) return;
        if (target.closest('.event-card-wrapper, .event-card, .day-header, .overlap-indicator, .overlap-menu, .overlap-backdrop')) {
            if (hoverLastCol >= 0) { hoverLastCol = -1; hoverLastRow = -1; hoverVisible = false; }
            return;
        }

        const cell = (e.target as HTMLElement).closest('.grid-cell');
        if (!cell) return;
        const gc = (cell as HTMLElement).style.gridColumn;
        const col = parseInt(gc) - 2;
        if (isNaN(col) || col < 0 || col >= dayCount) return;

        const y = e.clientY - gridEl.getBoundingClientRect().top;
        const row = Math.floor((y - 60) / 30) + 2;
        if (row < 2 || row > 48) return;

        if (col === hoverLastCol && row === hoverLastRow) return;
        hoverLastCol = col;
        hoverLastRow = row;
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

    let bgCtxMenu = $state<{ x: number; y: number; dateStr: string; startTime: string; endTime: string } | null>(null);

    function onGridContextMenu(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (target.closest('.event-card-wrapper, .event-card, .day-header, .overlap-indicator, .overlap-menu, .overlap-backdrop')) return;
        if (hoverCol < 0) return;
        e.preventDefault();
        const startTime = formatGridTime(hoverRow);
        const endTime = formatGridTime(hoverRow + 2);
        const dStr = formatDate(days[hoverCol]);
        bgCtxMenu = { x: e.clientX, y: e.clientY, dateStr: dStr, startTime, endTime };
    }

    function closeBgCtxMenu() {
        bgCtxMenu = null;
    }

    function insertMeeting() {
        if (!bgCtxMenu) return;
        onOpenManual(bgCtxMenu.dateStr, undefined, bgCtxMenu.startTime, bgCtxMenu.endTime);
        closeBgCtxMenu();
    }

    function insertPause() {
        if (!bgCtxMenu) return;
        onOpenManual(bgCtxMenu.dateStr, undefined, bgCtxMenu.startTime, bgCtxMenu.endTime, 'Pause');
        closeBgCtxMenu();
    }

    function insertOOO() {
        if (!bgCtxMenu) return;
        onOpenManual(bgCtxMenu.dateStr, undefined, bgCtxMenu.startTime, bgCtxMenu.endTime, 'Out of Office');
        closeBgCtxMenu();
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
        onDelete: () => void;
        zIndex: number;
        overlapEvents: { title: string; time: string; date: string; style: string; onClick: () => void }[];
    };

    const renderedEvents = $derived.by(() => {
        const result: RenderEvent[] = [];

        for (let i = 0; i < days.length; i++) {
            const d = days[i];
            const dStr = formatDate(d);
            const slots: { id: string; startMin: number; endMin: number }[] = [];
            const eventMap = new Map<string, { start: string; end: string; title: string; style: string; booking?: string; onClick: () => void; onBookingPaste: (b: string) => void; onDelete: () => void }>();

            // Work blocks
            const dayWorkData = calendarStore.workData[dStr] || [];
            const workDurItems = calendarStore.workDurationItems;
            const dayDurItems = workDurItems[dStr] || [];
            const totalWorkMin = dayWorkData.reduce((s, w) => s + getDurationMin(w.start, w.end), 0);
            const totalDurMin = dayDurItems.reduce((s, d) => s + d.durationMin, 0);
            let totalBookedMeetingMin = 0;
            let totalPauseMin = 0;
            calendarStore.events.forEach(ev => {
                if (csvDateToISO(ev["Start Date"]) !== dStr) return;
                if (isPause(ev.Subject)) { totalPauseMin += getDurationMin(ev["Start Time"], ev["End Time"]); return; }
                const booking = calendarStore.bookings[ev.id] || getDictBooking(calendarStore.bookingDict, calendarStore.dictRegexFlags, ev.Subject);
                if (booking) totalBookedMeetingMin += getDurationMin(ev["Start Time"], ev["End Time"]);
            });
            (calendarStore.manualMeetings[dStr] || []).forEach(m => {
                if (isPause(m.subject)) { totalPauseMin += getDurationMin(m.start, m.end); return; }
                if (m.booking || getDictBooking(calendarStore.bookingDict, calendarStore.dictRegexFlags, m.subject)) totalBookedMeetingMin += getDurationMin(m.start, m.end);
            });
            const netWorkMin = totalWorkMin - totalPauseMin;
            const fullyBooked = (totalDurMin + totalBookedMeetingMin) >= netWorkMin;
            dayWorkData.forEach((w, wi) => {
                const id = `work-${dStr}-${wi}`;
                const sm = toMinutes(w.start), em = toMinutes(w.end);
                if (!isNaN(sm) && !isNaN(em)) {
                    slots.push({ id, startMin: sm, endMin: em });
                    const unbookedMin = Math.max(0, netWorkMin - totalDurMin - totalBookedMeetingMin);
                    const isWorkBooked = unbookedMin === 0;
                    const wkStyle = isWorkBooked ? 'card-booked' : 'card-work';
                    const wkTitle = `ARBEIT: ${fullyBooked ? 'Gebucht' : '?'}`;
                    eventMap.set(id, { start: w.start, end: w.end, title: wkTitle, style: wkStyle, booking: '', onClick: () => onOpenWork(dStr), onBookingPaste: (b: string) => { if (unbookedMin > 0) { const items = calendarStore.workDurationItems[dStr] || []; items.push({ durationMin: unbookedMin, booking: b }); calendarStore.workDurationItems[dStr] = items; calendarStore.save(); calendarStore.dispatchDayEvent(dStr); } }, onDelete: () => { calendarStore.workData[dStr] = (calendarStore.workData[dStr] || []).filter((_, i) => i !== wi); calendarStore.save(); calendarStore.dispatchDayEvent(dStr); } });
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
                    const manualDictBooking = getDictBooking(calendarStore.bookingDict, calendarStore.dictRegexFlags, m.subject);
                    const effectiveBooking = manualDictBooking || m.booking;
                    const style = isManualOOO ? 'card-ooo' : (isPause(m.subject) ? 'card-ooo' : (effectiveBooking ? 'card-booked' : 'card-manual'));
                    const displayTitle = m.subject || (effectiveBooking || '').split(';')[3] || '';
                    eventMap.set(id, { start: m.start, end: m.end, title: displayTitle, style, booking: effectiveBooking, onClick: () => onOpenManual(dStr, m.id), onBookingPaste: (b: string) => { const meet = calendarStore.manualMeetings[dStr]?.find(x => x.id === m.id); if (meet) { meet.booking = b; calendarStore.save(); calendarStore.dispatchDayEvent(dStr); } }, onDelete: () => { calendarStore.manualMeetings[dStr] = (calendarStore.manualMeetings[dStr] || []).filter(x => x.id !== m.id); calendarStore.save(); calendarStore.dispatchDayEvent(dStr); } });
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
                    const dictBooking = getDictBooking(calendarStore.bookingDict, calendarStore.dictRegexFlags, ev.Subject);
                    const manualBooking = calendarStore.bookings[ev.id];
                    const effectiveBooking = dictBooking || manualBooking || '';
                    const hasZNR = !!effectiveBooking;
                    const ooo = isOOO(ev.Subject, ev["Show time as"]);
                    const style = ooo ? 'card-ooo' : (isPause(ev.Subject) ? 'card-pause' : (hasZNR ? 'card-booked' : 'card-csv'));
                    eventMap.set(id, { start: ev["Start Time"], end: ev["End Time"], title: ev.Subject, style, booking: effectiveBooking, onClick: () => onOpenMeeting(ev), onBookingPaste: (b: string) => { calendarStore.bookings[ev.id] = b; calendarStore.save(); calendarStore.dispatchDayEvent(dStr); }, onDelete: () => { calendarStore.events = calendarStore.events.filter(e => e.id !== ev.id); delete calendarStore.bookings[ev.id]; calendarStore.save(); calendarStore.dispatchDayEvent(dStr); } });
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
                    onDelete: info.onDelete,
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
            style="grid-template-columns: {colTemplate}"
            onpointermove={onGridPointerMove}
            onpointerleave={onGridPointerLeave}
            oncontextmenu={onGridContextMenu}
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
                    onDelete={ev.onDelete}
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

{#if bgCtxMenu}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-[9998]" onclick={closeBgCtxMenu} oncontextmenu={(e) => { e.preventDefault(); closeBgCtxMenu(); }}></div>
    <div
        class="fixed z-[9999] rounded-lg shadow-xl py-1 min-w-[180px]"
        style="top: {bgCtxMenu.y}px; left: {bgCtxMenu.x}px; background: var(--bg-card); border: 1px solid var(--border-main);"
    >
        <button
            class="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors"
            style="color: var(--text-primary)"
            onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'}
            onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            onclick={insertMeeting}
        >
            <CalendarPlus size={11} /> Meeting einfügen
        </button>
        <button
            class="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors"
            style="color: var(--text-primary)"
            onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'}
            onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            onclick={insertPause}
        >
            <Coffee size={11} /> Pause einfügen
        </button>
        <button
            class="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors"
            style="color: var(--text-primary)"
            onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'}
            onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            onclick={insertOOO}
        >
            <PlaneTakeoff size={11} /> Out of Office einfügen
        </button>
    </div>
{/if}

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
