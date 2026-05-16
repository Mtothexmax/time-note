
<script lang="ts">
    import { Copy, Plus } from 'lucide-svelte';
    import { calendarStore } from '$lib/stores/calendarStore.svelte';
    import { getDurationMin, formatDur, formatDate, csvDateToISO } from '$lib/utils/dateUtils';

    let { date, dayIndex, onAddManual, onAddWork } = $props<{
        date: Date;
        dayIndex: number;
        onAddManual: (dateStr: string) => void;
        onAddWork: (dateStr: string) => void;
    }>();

    const dateStr = $derived(formatDate(date));
    const dayNames = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
    const displayDate = $derived(`${dayNames[dayIndex]} ${date.getDate()}.${date.getMonth() + 1}.`);
    const isToday = $derived(dateStr === formatDate(new Date()));

    let copyFeedback = $state(false);

    const nettoMin = $derived.by(() => {
        const workIntervals = calendarStore.workData[dateStr] || [];
        const totalWorkMin = workIntervals.reduce((acc, curr) => acc + getDurationMin(curr.start, curr.end), 0);

        const pauseMin = calendarStore.events
            .filter(ev => {
                
                const iso = csvDateToISO(ev["Start Date"]);
                return iso === dateStr;

            })
            .filter(ev => ev.Subject.toLowerCase().includes("pause"))
            .reduce((sum, ev) => sum + getDurationMin(ev["Start Time"], ev["End Time"]), 0);

        const manualPauseMin = (calendarStore.manualMeetings[dateStr] || [])
            .filter(m => m.subject.toLowerCase().includes("pause"))
            .reduce((sum, m) => sum + getDurationMin(m.start, m.end), 0);

        return totalWorkMin - pauseMin - manualPauseMin;
    });

    const nettoDisplay = $derived(formatDur(Math.max(0, nettoMin)));

    function copyToClipboard() {
        const data = calendarStore.buildDayJSON(dateStr);
        const json = JSON.stringify(data, null, 2);
        const textArea = document.createElement("textarea");
        textArea.value = json;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            copyFeedback = true;
            setTimeout(() => copyFeedback = false, 1000);
        } catch (err) {
            console.error('Copy failed', err);
        }
        document.body.removeChild(textArea);
    }
</script>

<div class="day-header {isToday ? 'day-header-today' : ''}" style="grid-column: {dayIndex + 2}">
    <div class="flex justify-between items-start">
        <div>
            <div class="flex items-center gap-1">
                <span class="text-[10px] font-black uppercase" style="color: var(--text-secondary)">{displayDate}</span>
                {#if isToday}
                    <span class="w-1.5 h-1.5 rounded-full inline-block" style="background: var(--text-indigo-light)"></span>
                {/if}
            </div>
            <div class="text-[9px] font-bold" style="color: var(--text-indigo)">Netto: {nettoDisplay}h</div>
        </div>
        <div class="flex gap-1">
            <button 
                onclick={copyToClipboard}
                class="p-1 rounded transition-colors {copyFeedback ? 'bg-emerald-500 text-white' : 'hover:bg-emerald-100'}"
                title="In Zwischenablage kopieren"
            >
                <Copy size={12} />
            </button>
            <button 
                onclick={() => onAddWork(dateStr)}
                class="p-1 hover:bg-indigo-100 rounded text-indigo-600 transition-colors"
                title="Präsenzzeit eintragen"
            >
                <Plus size={12} />
            </button>
        </div>
    </div>
</div>

<style>
    .day-header {
        grid-row: 1;
        border-bottom: 2px solid var(--grid-line);
        text-align: center;
        background: var(--bg-header);
        padding: 8px;
        position: sticky;
        top: 0;
        z-index: 101;
    }
    .day-header-today {
        background: var(--header-today-bg);
        border-bottom-color: var(--header-today-border);
    }
</style>
