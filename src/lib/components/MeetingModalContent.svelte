
<script lang="ts">
    import { Trash2, Plus } from 'lucide-svelte';
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
        <input type="time" bind:value={localData.start} class="bg-slate-50 border p-2 rounded-xl text-sm">
        <input type="time" bind:value={localData.end} class="bg-slate-50 border p-2 rounded-xl text-sm">
        <input type="text" bind:value={localData.subject} placeholder="Titel" class="col-span-2 bg-slate-50 border p-2 rounded-xl text-sm font-bold">
    </div>

    <div>
        <label for="bookingInput" class="block text-[10px] font-black text-slate-400 uppercase mb-1">Buchungsnummer (ZNR)</label>
        <input 
            type="text" 
            id="bookingInput"
            bind:value={localData.booking} 
            class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-indigo-500 font-mono" 
            placeholder="P00000"
        >
    </div>

    {#if onDelete}
        <button onclick={onDelete} class="w-full text-red-500 text-xs font-bold py-2 border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
            Meeting löschen
        </button>
    {/if}

    <div class="flex gap-2 mt-6">
        <button onclick={() => onSave(localData)} class="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
            Speichern
        </button>
    </div>
</div>
