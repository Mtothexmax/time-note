
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
            <div class="flex gap-2 items-center p-2 rounded-xl" style="background: var(--modal-section-bg); border: 1px solid var(--modal-section-border)">
                <input type="time" bind:value={interval.start} class="w-20 rounded p-1 text-xs font-bold" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
                <input type="time" bind:value={interval.end} class="w-20 rounded p-1 text-xs font-bold" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
                <input type="text" bind:value={interval.booking} placeholder="ZNR" class="flex-1 rounded p-1 text-xs font-mono" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
                <button onclick={() => removeInterval(i)} class="transition-colors" style="color: var(--text-muted)">
                    <Trash2 size={12} />
                </button>
            </div>
        {/each}
    </div>
    
    <button onclick={addInterval} class="w-full py-2 border-2 border-dashed rounded-xl text-xs font-bold transition-all" style="border-color: var(--border-main); color: var(--text-muted)">
        <div class="flex items-center justify-center gap-1">
            <Plus size={14} /> Intervall
        </div>
    </button>

    <div class="flex gap-2 mt-6">
        <button onclick={() => onSave(localIntervals)} class="flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-colors" style="background: var(--text-indigo); color: white">
            Speichern
        </button>
    </div>
</div>
