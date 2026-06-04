
<script lang="ts">
    import { Trash2, Copy, ClipboardPaste, Scissors } from 'lucide-svelte';
    import TimePicker from './TimePicker.svelte';
    import DurationPicker from './DurationPicker.svelte';
    import BookingFields from './BookingFields.svelte';
    import { getDurationMin, formatDur, toMinutes } from '$lib/utils/dateUtils';
    import { calendarStore, getDictBooking, type WorkInterval, type DurationItem } from '$lib/stores/calendarStore.svelte';

    let { intervals, dateStr, onSave } = $props<{
        intervals: WorkInterval[];
        dateStr: string;
        onSave: (intervals: WorkInterval[], durationItems: DurationItem[]) => void;
    }>();

    let local = $state(intervals.map(clone));
    $effect(() => { local = intervals.map(clone); });

    function clone(w: WorkInterval): WorkInterval {
        return { start: w.start, end: w.end, booking: w.booking };
    }

    let durItems = $state<DurationItem[]>((calendarStore.workDurationItems[dateStr] || []).map(d => ({ ...d })));
    $effect(() => {
        durItems = (calendarStore.workDurationItems[dateStr] || []).map(d => ({ ...d }));
    });

    // ─── Timespan intervals ───

    function addInterval() {
        local.push({ start: '08:00', end: '16:30', booking: '' });
    }
    function removeInterval(i: number) { local.splice(i, 1); }

    function cloneWork(w: WorkInterval): WorkInterval {
        return { start: w.start, end: w.end, booking: w.booking };
    }

    function applyCardEntry(w: { booking: string }, entry: Record<string, string>) {
        w.booking = [entry.Projekt || '', entry.Vorgang || '', entry['Tätigkeit'] || '', entry.Bemerkung || ''].join(';');
    }

    async function openCardPaste(w: { booking: string }) {
        if (calendarStore.copiedBookingEntry) {
            applyCardEntry(w, calendarStore.copiedBookingEntry);
            return;
        }
        try {
            const text = await navigator.clipboard.readText();
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object') applyCardEntry(w, parsed);
        } catch {}
    }

    function copyCardDuration(dur: number, booking: string) {
        const parts = (booking || '').split(';');
        const entry: Record<string, string> = {
            Dauer: formatDur(dur),
            Projekt: parts[0] || '',
            Vorgang: parts[1] || '',
            'Tätigkeit': parts[2] || '',
            Bemerkung: parts[3] || ''
        };
        calendarStore.copiedBookingEntry = entry;
        navigator.clipboard.writeText(JSON.stringify(entry, null, 2)).catch(() => {});
    }

    // ─── Timespan split ───
    let splitDialog = $state<{ i: number; splitTime: string } | null>(null);

    function openSplit(i: number) {
        const w = local[i];
        const s = toMinutes(w.start);
        const e = toMinutes(w.end);
        const mid = s + Math.round((e - s) / 2 / 15) * 15;
        const h = Math.floor(mid / 60), m = mid % 60;
        splitDialog = { i, splitTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
    }

    function confirmSplit() {
        if (!splitDialog) return;
        const { i, splitTime } = splitDialog;
        const w = local[i];
        local.splice(i, 1,
            { start: w.start, end: splitTime, booking: w.booking },
            { start: splitTime, end: w.end, booking: '' }
        );
        splitDialog = null;
    }

    // ─── Duration items ───

    function addDurationItem() {
        durItems = [...durItems, { durationMin: 60, booking: '' }];
    }

    function removeDurationItem(i: number) {
        durItems = durItems.filter((_, idx) => idx !== i);
    }

    // Split a duration item in half
    function splitDurationItem(i: number) {
        const d = durItems[i];
        const half = Math.round(d.durationMin / 2 / 15) * 15;
        if (half < 15) return;
        durItems = [
            ...durItems.slice(0, i),
            { durationMin: half, booking: d.booking },
            { durationMin: d.durationMin - half, booking: '' },
            ...durItems.slice(i + 1)
        ];
    }

    // ─── Already Booked summary ───

    const dayEvents = $derived.by(() => {
        const result: { subject: string; start: string; end: string; dur: number; booking: string; isPause: boolean }[] = [];
        calendarStore.events.forEach(ev => {
            const p = ev["Start Date"]?.split('-');
            if (!p || p.length < 3) return;
            const evDateStr = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
            if (evDateStr !== dateStr) return;
            const sm = toMinutes(ev["Start Time"]), em = toMinutes(ev["End Time"]);
            if (isNaN(sm) || isNaN(em)) return;
            const booking = calendarStore.bookings[ev.id] || getDictBooking(calendarStore.bookingDict, calendarStore.dictRegexFlags, ev.Subject);
            result.push({ subject: ev.Subject, start: ev["Start Time"], end: ev["End Time"], dur: em - sm, booking, isPause: ev.Subject.toLowerCase().includes('pause') });
        });
        (calendarStore.manualMeetings[dateStr] || []).forEach(m => {
            const sm = toMinutes(m.start), em = toMinutes(m.end);
            if (isNaN(sm) || isNaN(em)) return;
            result.push({ subject: m.subject, start: m.start, end: m.end, dur: em - sm, booking: m.booking || '', isPause: m.subject.toLowerCase().includes('pause') });
        });
        result.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
        return result.filter(ev => !!ev.booking);
    });

    const bookedTotal = $derived(dayEvents.reduce((s, e) => s + e.dur, 0));
    const hasAnyEvent = $derived(dayEvents.length > 0);
    const totalPresenceMin = $derived(local.reduce((sum: number, w: WorkInterval) => sum + getDurationMin(w.start, w.end), 0));
    const durItemsTotal = $derived(durItems.reduce((s, d) => s + d.durationMin, 0));
    const unbookedMin = $derived(Math.max(0, totalPresenceMin - bookedTotal - durItemsTotal));

    // ─── Height equalisation ───

    let timespanGridEl: HTMLDivElement | undefined = $state();
    $effect(() => {
        local.length;
        const el = timespanGridEl;
        if (!el) return;
        const raf = requestAnimationFrame(() => {
            const items = [...el.children] as HTMLElement[];
            items.forEach(item => item.style.minHeight = '');
            const max = Math.max(...items.map(item => item.offsetHeight));
            if (max > 0) items.forEach(item => item.style.minHeight = `${max}px`);
        });
        return () => cancelAnimationFrame(raf);
    });

    let durGridEl: HTMLDivElement | undefined = $state();
    $effect(() => {
        durItems.length;
        const el = durGridEl;
        if (!el) return;
        const raf = requestAnimationFrame(() => {
            const items = [...el.children] as HTMLElement[];
            items.forEach(item => item.style.minHeight = '');
            const max = Math.max(...items.map(item => item.offsetHeight));
            if (max > 0) items.forEach(item => item.style.minHeight = `${max}px`);
        });
        return () => cancelAnimationFrame(raf);
    });
</script>

<!-- Split dialog -->
{#if splitDialog !== null}
    {@const w = local[splitDialog.i]}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-[2000] flex items-center justify-center" style="background: rgba(0,0,0,0.45);" onclick={() => splitDialog = null}>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="p-5 rounded-2xl shadow-2xl" style="background: var(--bg-card); border: 1px solid var(--border-main); min-width: 270px;" onclick={(e) => e.stopPropagation()}>
            <div class="text-sm font-bold mb-1">Intervall aufteilen</div>
            <div class="text-[10px] mb-3" style="color: var(--text-secondary)">
                {w.start} – {w.end} · {formatDur(getDurationMin(w.start, w.end))}h
            </div>
            <div class="mb-3">
                <div class="text-[9px] font-bold uppercase mb-1.5" style="color: var(--text-muted)">Trennzeitpunkt</div>
                <TimePicker value={splitDialog.splitTime} onChange={(v) => splitDialog = { ...splitDialog!, splitTime: v }} minTime={w.start} />
            </div>
            <div class="flex gap-4 text-[10px] mb-4" style="color: var(--text-muted)">
                <div>
                    <div>{w.start} – {splitDialog.splitTime}</div>
                    <div class="font-bold" style="color: var(--text-indigo)">{formatDur(getDurationMin(w.start, splitDialog.splitTime))}h</div>
                </div>
                <div>
                    <div>{splitDialog.splitTime} – {w.end}</div>
                    <div class="font-bold" style="color: var(--text-indigo)">{formatDur(getDurationMin(splitDialog.splitTime, w.end))}h</div>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick={() => splitDialog = null} class="flex-1 py-2 rounded-xl text-xs font-bold" style="background: var(--bg-page); color: var(--text-muted)">Abbrechen</button>
                <button onclick={confirmSplit} class="flex-1 py-2 rounded-xl text-xs font-bold" style="background: var(--text-indigo); color: white">Aufteilen</button>
            </div>
        </div>
    </div>
{/if}

<div class="space-y-5">

    <!-- ═══ Presence time intervals ═══ -->
    <div>
        <div class="text-sm font-bold mb-3" style="color: var(--text-primary)">Anwesenheitszeit</div>
        <div bind:this={timespanGridEl} class="grid gap-3" style="grid-template-columns: repeat(3, 1fr);">
            {#each local as w, i}
                <div class="p-3 rounded-xl flex flex-col items-center" style="background: var(--modal-section-bg); border: 1px solid var(--modal-section-border); box-sizing: border-box; min-width: 0;">
                    <div class="flex items-center gap-1">
                        <TimePicker value={w.start} onChange={(v) => w.start = v} />
                        <span style="color: var(--text-muted); font-size: 13px; font-weight: 600;">–</span>
                        <TimePicker value={w.end} onChange={(v) => w.end = v} minTime={w.start} />
                        <button onclick={() => removeInterval(i)} class="ml-auto transition-colors" style="color: var(--text-muted)" title="Intervall entfernen">
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
            {/each}
            <div style="border: 2px dashed var(--border-main); border-radius: 12px; cursor: pointer;">
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div onclick={addInterval} style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;text-align:center;color:var(--text-muted);font-size:12px;font-weight:700;height:100%;">
                    + Intervall
                </div>
            </div>
        </div>
    </div>

    <!-- ═══ Buchungen grid (cards + duration items) ═══ -->
    <div>
        <div class="text-sm font-bold mb-3" style="color: var(--text-primary)">Buchungen</div>
        <div bind:this={durGridEl} class="grid gap-3" style="grid-template-columns: repeat(3, 1fr);">
            <!-- Already Booked card -->
            {#if hasAnyEvent}
                <div class="p-3 rounded-xl flex flex-col" style="background: var(--modal-section-bg); border: 1px solid var(--modal-section-border); box-sizing: border-box; min-width: 0;">
                    <div class="text-[10px] font-bold uppercase mb-2" style="color: var(--text-muted)">Gebuchte Termine</div>
                    <div class="flex-1 space-y-1 min-w-0">
                        {#each dayEvents as ev}
                            <div class="flex items-center gap-1 text-[10px]" style="color: var(--text-secondary);">
                                <span class="font-mono font-bold shrink-0" style="color: var(--text-primary); min-width: 65px;">{ev.start}–{ev.end}</span>
                                <span class="truncate min-w-0" class:line-through={ev.isPause} style="color: {ev.isPause ? 'var(--text-muted)' : 'var(--text-primary)'};">{ev.subject}</span>
                            </div>
                        {/each}
                    </div>
                    <div class="flex justify-between items-center pt-2 mt-2 text-xs font-bold" style="border-top: 1px solid var(--border-main); color: var(--text-primary);">
                        <span>Total</span>
                        <span>{formatDur(bookedTotal)}</span>
                    </div>
                </div>
            {/if}

            <!-- Unbooked Time card -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div onclick={() => { if (unbookedMin > 0) durItems = [...durItems, { durationMin: unbookedMin, booking: '' }]; }} class="p-3 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors" style="background: var(--modal-section-bg); border: 1px solid var(--modal-section-border); box-sizing: border-box; min-width: 0;" onmouseenter={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-indigo)'} onmouseleave={(e) => (e.currentTarget as HTMLElement).style.borderColor = ''}>
                <div class="text-[10px] font-bold uppercase mb-1" style="color: var(--text-muted)">Ungebuchte Zeit</div>
                <div class="text-2xl font-bold" style="color: var(--text-indigo); line-height: 1.2;">{formatDur(unbookedMin)}</div>
                <div class="text-[10px]" style="color: var(--text-muted);">/ {formatDur(totalPresenceMin)}</div>
            </div>

            <!-- + Buchung button -->
            <div style="border: 2px dashed var(--border-main); border-radius: 12px; cursor: pointer;">
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div onclick={addDurationItem} style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;text-align:center;color:var(--text-muted);font-size:12px;font-weight:700;height:100%;">
                    + Buchung
                </div>
            </div>

            <!-- Duration items -->
            {#each durItems as d, i}
                <div class="p-3 rounded-xl flex flex-col" style="background: var(--modal-section-bg); border: 1px solid var(--modal-section-border); box-sizing: border-box; min-width: 0;">
                    <div class="flex items-center gap-1 mb-2">
                        <DurationPicker value={d.durationMin} onChange={(v) => d.durationMin = v} allowTyping={true} />
                        {#if unbookedMin > 0}
                            <button
                                onclick={() => d.durationMin += unbookedMin}
                                title="Ungebuchte Zeit hinzufügen ({formatDur(unbookedMin)}h)"
                                class="text-[9px] px-1.5 py-0.5 rounded font-bold transition-opacity"
                                style="background: var(--text-indigo); color: white; opacity: 0.75; white-space: nowrap; flex-shrink: 0;"
                            >+{formatDur(unbookedMin)}</button>
                        {/if}
                        <button onclick={() => removeDurationItem(i)} class="ml-auto transition-colors" style="color: var(--text-muted)" title="Entfernen">
                            <Trash2 size={12} />
                        </button>
                    </div>
                    <div class="flex-1">
                        <BookingFields value={d.booking} onChange={(v) => d.booking = v} />
                    </div>
                    <div class="flex justify-end gap-1 mt-2">
                        <button onclick={() => { copyCardDuration(d.durationMin, d.booking); }} class="p-1 rounded transition-colors" style="color: var(--text-muted)" title="Als JSON kopieren">
                            <Copy size={11} />
                        </button>
                        <button onclick={() => openCardPaste(d)} class="p-1 rounded transition-colors" style="color: var(--text-muted)" title="Buchung einfügen">
                            <ClipboardPaste size={11} />
                        </button>
                        <button onclick={() => splitDurationItem(i)} class="p-1 rounded transition-colors" style="color: var(--text-muted)" title="Dauer teilen">
                            <Scissors size={11} />
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    </div>

    <div class="flex gap-2 mt-6">
        <button onclick={() => onSave(local, durItems)} class="flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-colors" style="background: var(--text-indigo); color: white">
            Speichern
        </button>
    </div>
</div>
