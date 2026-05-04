
<script lang="ts">
    import { Trash2, Plus } from 'lucide-svelte';
    import BookingInput from './BookingInput.svelte';
    import TimePicker from './TimePicker.svelte';
    import { calendarStore, type ManualMeeting, type WorkInterval } from '$lib/stores/calendarStore.svelte';

    let { 
        isManual, 
        meetingData, 
        onSave, 
        onDelete 
    } = $props<{
        isManual: boolean;
        meetingData: {
            id?: string;
            start: string;
            end: string;
            subject: string;
            booking?: string;
            timeInfo?: string;
        };
        onSave: (data: any) => void;
        onDelete?: () => void;
    }>();

    let localData = $state({ ...meetingData });

    $effect(() => {
        localData = { ...meetingData };
    });
</script>

<div class="space-y-4">
    <div class="grid grid-cols-2 gap-2 mb-4">
        <TimePicker value={localData.start} onChange={(v) => localData.start = v} />
        <TimePicker value={localData.end} onChange={(v) => localData.end = v} />
        <input type="text" bind:value={localData.subject} placeholder="Titel" class="col-span-2 p-2 rounded-xl text-sm font-bold" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
    </div>

    <div>
        <label class="block text-[10px] font-black uppercase mb-1" style="color: var(--text-muted)">Buchungsnummer</label>
        <BookingInput value={localData.booking ?? ''} onChange={(v) => localData.booking = v} />
    </div>

    {#if onDelete}
        <button onclick={onDelete} class="w-full text-xs font-bold py-2 rounded-xl transition-colors" style="color: var(--btn-checkout-text); border: 1px solid var(--btn-checkout-border); background: var(--btn-checkout-bg)">
            Meeting löschen
        </button>
    {/if}

    <div class="flex gap-2 mt-6">
        <button onclick={() => onSave(localData)} class="flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-colors" style="background: var(--text-indigo); color: white">
            Speichern
        </button>
    </div>
</div>
