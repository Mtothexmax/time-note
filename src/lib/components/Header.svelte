
<script lang="ts">
    import { ChevronLeft, ChevronRight, Upload, Trash2, Play, Square, BookOpen, Info } from 'lucide-svelte';
    import { calendarStore } from '$lib/stores/calendarStore.svelte';
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

        // Overlap between pause ranges and current session [arriveMin, nowMin]
        const fmt = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        const arriveMin = toMinutes(fmt(arrive));
        const nowMin    = toMinutes(fmt(current));
        const pauseOverlap = pauseRanges.reduce((sum, p) => {
            const os = Math.max(toMinutes(p.start), arriveMin);
            const oe = Math.min(toMinutes(p.end),   nowMin);
            return sum + Math.max(0, oe - os);
        }, 0);

        const totalMin = Math.max(0, prevMin + currentMin - pauseOverlap);
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
        {#if calendarStore.checkIn}
            <button onclick={() => calendarStore.checkOutNow()}
                class="flex items-center gap-1.5 px-3 py-2 rounded-xl transition text-xs font-bold border"
                style="background: var(--btn-checkout-bg); color: var(--btn-checkout-text); border-color: var(--btn-checkout-border); cursor: pointer"
                title="Eingecheckt seit {checkInArrival}"
                onmouseenter={(e) => (e.target as HTMLElement).style.background = 'var(--btn-checkout-border)'}
                onmouseleave={(e) => (e.target as HTMLElement).style.background = 'var(--btn-checkout-bg)'}>
                <Square size={14} /> {checkInElapsed}h
            </button>
        {:else}
            <button onclick={() => calendarStore.checkInNow()}
                class="flex items-center gap-1.5 px-3 py-2 rounded-xl transition text-xs font-bold border"
                style="background: var(--btn-checkin-bg); color: var(--btn-checkin-text); border-color: var(--btn-checkin-border); cursor: pointer"
                onmouseenter={(e) => (e.target as HTMLElement).style.background = 'var(--btn-checkin-border)'}
                onmouseleave={(e) => (e.target as HTMLElement).style.background = 'var(--btn-checkin-bg)'}>
                <Play size={14} /> Einchecken
            </button>
        {/if}
        <input type="file" id="csvInput" accept=".csv" class="hidden" onchange={handleFileUpload}>
        <label for="csvInput" class="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition text-xs font-bold">
            <Upload size={16} /> CSV
        </label>
            <button onclick={clearAll} class="p-2 text-slate-300 hover:text-red-500 transition">
            <Trash2 size={16} />
        </button>
        {#if onOpenBookingDict}
            <button onclick={onOpenBookingDict} class="p-2 transition-colors" style="color: var(--text-muted)" title="Buchungsnummern-Dictionary">
                <BookOpen size={16} />
            </button>
        {/if}
        <button onclick={() => infoOpen = true} class="p-2 transition-colors" style="color: var(--text-muted)" title="Info">
            <Info size={16} />
        </button>
    </div>
</header>

<InfoModal isOpen={infoOpen} onClose={() => infoOpen = false} />
