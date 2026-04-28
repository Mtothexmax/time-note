
<script lang="ts">
    import { Trash2, Plus } from 'lucide-svelte';
    import type { WorkInterval } from '$lib/stores/calendarStore.svelte';

    let { intervals, onSave } = $props<{
        intervals: WorkInterval[];
        onSave: (intervals: WorkInterval[]) => void;
    }>();

    let localIntervals = $state([...intervals]);

    $effect(() => {
        localIntervals = [...intervals];
    });

    function addInterval() {
        localIntervals.push({ start: "08:00", end: "16:30", booking: "" });
    }

    function removeInterval(index: number) {
        localIntervals.splice(index, 1);
    }
</script>

<div class="space-y-4">
    <div class="space-y-2">
        {#each localIntervals as interval, i}
            <div class="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                <input type="time" bind:value={interval.start} class="w-20 bg-white border rounded p-1 text-xs font-bold">
                <input type="time" bind:value={interval.end} class="w-20 bg-white border rounded p-1 text-xs font-bold">
                <input type="text" bind:value={interval.booking} placeholder="ZNR" class="flex-1 bg-white border rounded p-1 text-xs font-mono">
                <button onclick={() => removeInterval(i)} class="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={12} />
                </button>
            </div>
        {/each}
    </div>
    
    <button onclick={addInterval} class="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all">
        <div class="flex items-center justify-center gap-1">
            <Plus size={14} /> Intervall
        </div>
    </button>

    <div class="flex gap-2 mt-6">
        <button onclick={() => onSave(localIntervals)} class="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
            Speichern
        </button>
    </div>
</div>
