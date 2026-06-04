
<script lang="ts">
    import { ChevronLeft, ChevronRight, Upload, Download, Trash2, Play, Square, BookOpen, Info, ClipboardPaste } from 'lucide-svelte';
    import BookingFields from './BookingFields.svelte';
    import TimePicker from './TimePicker.svelte';
    import { calendarStore, getDictBooking, type WorkInterval, type DurationItem } from '$lib/stores/calendarStore.svelte';
    import { formatDate, getDurationMin, toMinutes, csvDateToISO } from '$lib/utils/dateUtils';
    import InfoModal from './InfoModal.svelte';

    let { onOpenBookingDict } = $props<{ onOpenBookingDict?: () => void }>();
    let infoOpen = $state(false);

    // Ticks every 30s so the counter stays live
    let now = $state(Date.now());
    $effect(() => {
        const id = setInterval(() => { now = Date.now(); }, 30000);
        return () => clearInterval(id);
    });

    const weekRange = $derived.by(() => {
        const s = calendarStore.currentWeekStart;
        const e = new Date(s.getTime() + 6 * 86400000);
        return `${s.getDate()}.${s.getMonth() + 1}. – ${e.getDate()}.${e.getMonth() + 1}.${e.getFullYear()}`;
    });

    const checkInElapsed = $derived.by(() => {
        if (!calendarStore.checkIn) return null;
        const arrive = new Date(calendarStore.checkIn);
        const current = new Date(now);
        const today = formatDate(current);

        // Accumulated minutes from previous check-out sessions today
        const prevMin = (calendarStore.workData[today] || [])
            .reduce((acc, w) => acc + getDurationMin(w.start, w.end), 0);

        // Current session in minutes
        const currentMin = (current.getTime() - arrive.getTime()) / 60000;

        // Pause events for today
        const pauseRanges = [
            ...calendarStore.events
                .filter(ev => csvDateToISO(ev["Start Date"]) === today && ev.Subject.toLowerCase().includes('pause'))
                .map(e => ({ start: e["Start Time"], end: e["End Time"] })),
            ...(calendarStore.manualMeetings[today] || [])
                .filter(m => m.subject.toLowerCase().includes('pause'))
                .map(m => ({ start: m.start, end: m.end }))
        ];

        // Overlap between pause ranges and current session [arriveMin, nowMin], capped at 23:59
        const fmt = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        const arriveMin = toMinutes(fmt(arrive));
        const nowMin    = Math.min(1439, toMinutes(fmt(current)));
        const pauseOverlap = pauseRanges.reduce((sum, p) => {
            const os = Math.max(toMinutes(p.start), arriveMin);
            const oe = Math.min(toMinutes(p.end),   nowMin);
            return sum + Math.max(0, oe - os);
        }, 0);

        const totalMin = Math.min(1439, Math.max(0, prevMin + currentMin - pauseOverlap));
        const h = Math.floor(totalMin / 60);
        const m = Math.floor(totalMin % 60);
        return `${h}:${String(m).padStart(2, '0')}`;
    });

    const checkInArrival = $derived(calendarStore.checkIn
        ? new Date(calendarStore.checkIn).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        : null);

    function handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const lines = content.split(/\r?\n/).filter(l => l.trim().includes(','));
            if (lines.length < 2) return;

            const headers = lines[0].split('","').map(h => h.replace(/"/g, '').trim());
            const events = lines.slice(1).map(l => {
                const vals = l.split('","').map(v => v.replace(/"/g, '').trim());
                const obj: any = {};
                headers.forEach((h, idx) => obj[h] = vals[idx] || "");
                if (obj.Subject && obj["Start Date"]) {
                    obj.id = `ev-${obj.Subject}-${obj["Start Date"]}-${obj["Start Time"]}`.replace(/[^a-z0-9]/gi, '');
                }
                return obj;
            }).filter(o => o.id);

            calendarStore.events = events;
            calendarStore.save();
            const dates = new Set(events.map(ev => {
                const p = ev["Start Date"].split('-');
                return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
            }));
            dates.forEach(d => calendarStore.dispatchDayEvent(d));
        };
        reader.readAsText(input.files[0]);
    }

    function clearAll() {
        if (confirm("Wirklich alles löschen?")) {
            calendarStore.clearAll();
            localStorage.clear();
            location.reload();
        }
    }

    function exportJSON() {
        const json  = calendarStore.exportJSON();
        const blob  = new Blob([json], { type: 'application/json' });
        const url   = URL.createObjectURL(blob);
        const a     = document.createElement('a');
        a.href      = url;
        a.download  = `time-note-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleJSONImport(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const ok = calendarStore.importJSON(e.target?.result as string);
            if (!ok) alert('Ungültige JSON-Datei');
        };
        reader.readAsText(input.files[0]);
        input.value = '';
    }

    let checkinCtx = $state<{ x: number; y: number } | null>(null);
    let checkinMode = $state<'adjust' | 'insert' | null>(null);
    let checkinPasteTime = $state('');
    let checkinPasteBooking = $state('');
    let dialogRef: HTMLDivElement | undefined = $state();

    function openCheckinCtx(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        checkinCtx = { x: e.clientX, y: e.clientY };
    }

    function closeCheckinCtx() {
        checkinCtx = null;
        checkinMode = null;
    }

    function currentTimeStr() {
        return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    function openCheckinAdjust() {
        checkinCtx = null;
        checkinPasteTime = calendarStore.checkIn
            ? new Date(calendarStore.checkIn).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            : currentTimeStr();
        checkinPasteBooking = '';
        checkinMode = 'adjust';
    }

    function openCheckinPaste() {
        checkinCtx = null;
        checkinPasteTime = calendarStore.checkIn
            ? new Date(calendarStore.checkIn).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            : currentTimeStr();
        checkinPasteBooking = calendarStore.copiedBookingEntry
            ? [calendarStore.copiedBookingEntry.Projekt || '', calendarStore.copiedBookingEntry.Vorgang || '', calendarStore.copiedBookingEntry['Tätigkeit'] || '', calendarStore.copiedBookingEntry.Bemerkung || ''].join(';')
            : '';
        checkinMode = 'insert';
    }

    function confirmCheckinPaste() {
        if (checkinMode === 'adjust') {
            const [h, m] = checkinPasteTime.split(':').map(Number);
            const adjusted = new Date();
            adjusted.setHours(h, m, 0, 0);
            calendarStore.checkIn = adjusted.toISOString();
            calendarStore.save();
            closeCheckinCtx();
            return;
        }
        const today = formatDate(new Date());
        if (!calendarStore.workData[today]) calendarStore.workData[today] = [];
        calendarStore.workData[today].push({ start: checkinPasteTime, end: currentTimeStr(), booking: '' });
        const unbooked = (calendarStore.workData[today] || []).reduce((s, w) => s + getDurationMin(w.start, w.end), 0)
            - (calendarStore.workDurationItems[today] || []).reduce((s, d) => s + d.durationMin, 0);
        let bookedMeetingMin = 0;
        calendarStore.events.forEach(ev => {
            if (csvDateToISO(ev["Start Date"]) !== today) return;
            if (calendarStore.bookings[ev.id] || getDictBooking(calendarStore.bookingDict, calendarStore.dictRegexFlags, ev.Subject)) bookedMeetingMin += getDurationMin(ev["Start Time"], ev["End Time"]);
        });
        (calendarStore.manualMeetings[today] || []).forEach(m => {
            if (m.booking || getDictBooking(calendarStore.bookingDict, calendarStore.dictRegexFlags, m.subject)) bookedMeetingMin += getDurationMin(m.start, m.end);
        });
        const unbookedMin = Math.max(0, unbooked - bookedMeetingMin);
        if (unbookedMin > 0 && checkinPasteBooking) {
            const items = calendarStore.workDurationItems[today] || [];
            items.push({ durationMin: unbookedMin, booking: checkinPasteBooking });
            calendarStore.workDurationItems[today] = items;
        }
        calendarStore.save();
        calendarStore.dispatchDayEvent(today);
        closeCheckinCtx();
    }
</script>

<header class="flex flex-wrap justify-between items-center mb-4 p-4 rounded-2xl shadow-sm gap-4" style="background: var(--bg-card); border-color: var(--border-main)">
    <div class="flex items-center gap-6">
        <label class="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer" style="background: var(--bg-page); border: 1px solid var(--border-main)">
            <input 
                type="checkbox" 
                bind:checked={calendarStore.hideOOO} 
                onchange={() => calendarStore.save()}
                class="w-4 h-4 rounded" style="accent-color: var(--text-indigo)"
            >
            <span class="text-xs font-bold" style="color: var(--text-secondary)">OOO ausblenden</span>
        </label>
        <label class="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer" style="background: var(--bg-page); border: 1px solid var(--border-main)">
            <input 
                type="checkbox" 
                bind:checked={calendarStore.hideWeekends} 
                onchange={() => calendarStore.save()}
                class="w-4 h-4 rounded" style="accent-color: var(--text-indigo)"
            >
            <span class="text-xs font-bold" style="color: var(--text-secondary)">Wochenende ausblenden</span>
        </label>
    </div>
    
    <div class="flex items-center gap-1 p-1 rounded-xl" style="background: var(--nav-bg)">
        <button onclick={() => calendarStore.changeWeek(-1)} class="p-2 rounded-lg transition" style="color: var(--nav-text)" onmouseenter={(e) => (e.target as HTMLElement).style.background = 'var(--nav-hover)'} onmouseleave={(e) => (e.target as HTMLElement).style.background = 'transparent'} title="Vorherige Woche">
            <ChevronLeft size={16} />
        </button>
        <button onclick={() => calendarStore.goToToday()} class="px-4 py-2 rounded-lg font-bold text-xs transition" style="color: var(--nav-text); background: transparent" onmouseenter={(e) => (e.target as HTMLElement).style.background = 'var(--nav-hover)'} onmouseleave={(e) => (e.target as HTMLElement).style.background = 'transparent'} title="Aktuelle Woche">
            {weekRange}
        </button>
        <button onclick={() => calendarStore.changeWeek(1)} class="p-2 rounded-lg transition" style="color: var(--nav-text)" onmouseenter={(e) => (e.target as HTMLElement).style.background = 'var(--nav-hover)'} onmouseleave={(e) => (e.target as HTMLElement).style.background = 'transparent'} title="Nächste Woche">
            <ChevronRight size={16} />
        </button>
    </div>

    <div class="flex items-center gap-2">
        {#if calendarStore.checkinEnabled}
            {#if calendarStore.checkIn}
                <button onclick={() => calendarStore.checkOutNow()}
                    oncontextmenu={openCheckinCtx}
                    class="flex items-center gap-1.5 px-3 py-2 rounded-xl transition text-xs font-bold border"
                    style="background: var(--btn-checkout-bg); color: var(--btn-checkout-text); border-color: var(--btn-checkout-border); cursor: pointer"
                    title="Eingecheckt seit {checkInArrival}"
                    onmouseenter={(e) => (e.target as HTMLElement).style.background = 'var(--btn-checkout-border)'}
                    onmouseleave={(e) => (e.target as HTMLElement).style.background = 'var(--btn-checkout-bg)'}>
                    <Square size={14} /> {checkInElapsed}h
                </button>
            {:else}
                <button onclick={() => calendarStore.checkInNow()}
                    oncontextmenu={openCheckinCtx}
                    class="flex items-center gap-1.5 px-3 py-2 rounded-xl transition text-xs font-bold border"
                    style="background: var(--btn-checkin-bg); color: var(--btn-checkin-text); border-color: var(--btn-checkin-border); cursor: pointer"
                    onmouseenter={(e) => (e.target as HTMLElement).style.background = 'var(--btn-checkin-border)'}
                    onmouseleave={(e) => (e.target as HTMLElement).style.background = 'var(--btn-checkin-bg)'}>
                    <Play size={14} /> Einchecken
                </button>
            {/if}
        {/if}
        <input type="file" id="csvInput" accept=".csv" class="hidden" onchange={handleFileUpload}>
        <label for="csvInput" class="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition text-xs font-bold">
            <Upload size={16} /> CSV
        </label>
        <input type="file" id="jsonInput" accept=".json" class="hidden" onchange={handleJSONImport}>
        <label for="jsonInput" class="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-xl transition text-xs font-bold" style="background: var(--bg-page); border: 1px solid var(--border-main); color: var(--text-muted)" title="Daten aus JSON importieren">
            <Upload size={14} /> JSON
        </label>
        <button onclick={exportJSON} class="flex items-center gap-2 px-3 py-2 rounded-xl transition text-xs font-bold" style="background: var(--bg-page); border: 1px solid var(--border-main); color: var(--text-muted)" title="Daten als JSON exportieren">
            <Download size={14} /> JSON
        </button>
            <button onclick={clearAll} class="flex items-center justify-center p-2 rounded-xl transition text-xs font-bold" style="background: var(--bg-page); border: 1px solid var(--border-main); color: var(--text-muted)" title="Alle Daten löschen">
            <Trash2 size={14} />
        </button>
        {#if onOpenBookingDict}
            <button onclick={onOpenBookingDict} class="flex items-center justify-center p-2 rounded-xl transition text-xs font-bold" style="background: var(--bg-page); border: 1px solid var(--border-main); color: var(--text-muted)" title="Buchungsnummern-Dictionary">
                <BookOpen size={14} />
            </button>
        {/if}
        <button onclick={() => infoOpen = true} class="flex items-center justify-center p-2 rounded-xl transition text-xs font-bold" style="background: var(--bg-page); border: 1px solid var(--border-main); color: var(--text-muted)" title="Info">
            <Info size={14} />
        </button>
    </div>
</header>

{#if checkinCtx && checkinMode === null}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-[9998]" onclick={closeCheckinCtx}></div>
    <div
        class="fixed z-[9999] rounded-lg shadow-xl py-1 min-w-[180px]"
        style="top: {checkinCtx.y}px; left: {checkinCtx.x}px; background: var(--bg-card); border: 1px solid var(--border-main);"
    >
        <div class="px-2 py-1 text-[9px] font-black uppercase tracking-wider" style="color: var(--text-muted)">Check-In</div>
        <div style="border-top: 1px solid var(--border-main); margin: 2px 0;"></div>
        <button
            class="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors"
            style="color: var(--text-primary)"
            onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'}
            onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            onclick={openCheckinAdjust}
        >
            <Play size={11} /> Anpassen
        </button>
        <button
            class="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors"
            style="color: var(--text-primary)"
            onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'}
            onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            onclick={openCheckinPaste}
        >
            <ClipboardPaste size={11} /> Einfügen
        </button>
    </div>
{/if}

{#if checkinMode !== null}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-[2000] flex items-center justify-center" style="background: rgba(0,0,0,0.45);" onclick={(e) => { if (dialogRef && !dialogRef.contains(e.target as Node)) closeCheckinCtx(); }}>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div bind:this={dialogRef} class="p-5 rounded-2xl shadow-2xl" style="background: var(--bg-card); border: 1px solid var(--border-main); min-width: 300px;" onclick={(e) => e.stopPropagation()}>
            <div class="text-sm font-bold mb-3">{checkinMode === 'adjust' ? 'Check-In anpassen' : 'Einchecken & Einfügen'}</div>
            <div class="mb-3">
                <div class="text-[9px] font-bold uppercase mb-1.5" style="color: var(--text-muted)">Gekommen</div>
                <TimePicker value={checkinPasteTime} onChange={(v) => checkinPasteTime = v} />
            </div>
            {#if checkinMode === 'insert'}
                <div class="mb-3">
                    <div class="text-[9px] font-bold uppercase mb-1.5" style="color: var(--text-muted)">Buchung</div>
                    <BookingFields value={checkinPasteBooking} onChange={(v) => checkinPasteBooking = v} />
                </div>
            {/if}
            <div class="flex gap-2">
                <button onclick={closeCheckinCtx} class="flex-1 py-2 rounded-xl text-xs font-bold" style="background: var(--bg-page); color: var(--text-muted)">Abbrechen</button>
                <button onclick={confirmCheckinPaste} class="flex-1 py-2 rounded-xl text-xs font-bold" style="background: var(--text-indigo); color: white">{checkinMode === 'adjust' ? 'Anpassen' : 'Einchecken & Einfügen'}</button>
            </div>
        </div>
    </div>
{/if}

<InfoModal isOpen={infoOpen} onClose={() => infoOpen = false} />
