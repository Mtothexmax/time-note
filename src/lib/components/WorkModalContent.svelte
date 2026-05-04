
<script lang="ts">
    import { Trash2, Plus, Copy } from 'lucide-svelte';
    import BookingInput from './BookingInput.svelte';
    import TimePicker from './TimePicker.svelte';
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

    function copyBookingToAll(index: number) {
        const booking = localIntervals[index].booking;
        if (!booking) return;
        localIntervals = localIntervals.map((iv, i) => i === index ? iv : { ...iv, booking });
    }
</script>

<div class="space-y-4">
    <div class="space-y-2">
        {#each localIntervals as interval, i}
            <div class="flex gap-2 items-center p-2 rounded-xl" style="background: var(--modal-section-bg); border: 1px solid var(--modal-section-border)">
                <TimePicker value={interval.start} onChange={(v) => interval.start = v} />
                <TimePicker value={interval.end} onChange={(v) => interval.end = v} />
                <div class="flex-1 min-w-0">
                    <BookingInput value={interval.booking} onChange={(v) => interval.booking = v} />
                </div>
                <button onclick={() => copyBookingToAll(i)} class="transition-colors" style="color: var(--text-muted)" title="Buchungsnummer auf alle Intervalle kopieren">
                    <Copy size={12} />
                </button>
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
