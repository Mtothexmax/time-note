
<script lang="ts">
    import { ChevronLeft, ChevronRight, Upload, Trash2, Play, Square, BookOpen } from 'lucide-svelte';
    import { calendarStore } from '$lib/stores/calendarStore.svelte';

    let { onOpenBookingDict } = $props<{ onOpenBookingDict?: () => void }>();

    const currentMonthDisplay = $derived(`WOCHE VOM ${calendarStore.currentWeekStart.toLocaleDateString('de-DE')}`);
    const checkInTime = $derived(calendarStore.checkIn
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

<header class="flex flex-wrap justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 gap-4">
    <div class="flex items-center gap-6">
        <div>
            <h1 class="text-xl font-black text-indigo-600 tracking-tighter uppercase">Time-Note</h1>
            <p class="text-xs text-slate-400 font-bold">{currentMonthDisplay}</p>
        </div>
        <label class="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg cursor-pointer border border-slate-200">
            <input 
                type="checkbox" 
                bind:checked={calendarStore.hideOOO} 
                onchange={() => calendarStore.save()}
                class="w-4 h-4 text-indigo-600 rounded"
            >
            <span class="text-xs font-bold text-slate-600">OOO ausblenden</span>
        </label>
        <label class="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg cursor-pointer border border-slate-200">
            <input 
                type="checkbox" 
                bind:checked={calendarStore.hideWeekends} 
                onchange={() => calendarStore.save()}
                class="w-4 h-4 text-indigo-600 rounded"
            >
            <span class="text-xs font-bold text-slate-600">Wochenende ausblenden</span>
        </label>
    </div>
    
    <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
        <button onclick={() => calendarStore.changeWeek(-1)} class="p-2 hover:bg-white rounded-lg transition">
            <ChevronLeft size={16} />
        </button>
        <button onclick={() => calendarStore.goToToday()} class="px-4 py-2 hover:bg-white rounded-lg font-bold text-xs transition uppercase">
            Heute
        </button>
        <button onclick={() => calendarStore.changeWeek(1)} class="p-2 hover:bg-white rounded-lg transition">
            <ChevronRight size={16} />
        </button>
    </div>

    <div class="flex items-center gap-2">
        {#if calendarStore.checkIn}
            <button onclick={() => calendarStore.checkOutNow()}
                class="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition text-xs font-bold border border-red-200">
                <Square size={14} /> Auschecken {checkInTime}
            </button>
        {:else}
            <button onclick={() => calendarStore.checkInNow()}
                class="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition text-xs font-bold border border-emerald-200">
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
            <button onclick={onOpenBookingDict} class="p-2 text-slate-400 hover:text-indigo-500 transition" title="Buchungsnummern-Dictionary">
                <BookOpen size={16} />
            </button>
        {/if}
    </div>
</header>
