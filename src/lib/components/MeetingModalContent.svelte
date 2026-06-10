
<script lang="ts">
    import { Copy, ClipboardPaste } from 'lucide-svelte';
    import TimeEntry from './TimeEntry.svelte';
    import { calendarStore } from '$lib/stores/calendarStore.svelte';
    import { getDurationMin, formatDur } from '$lib/utils/dateUtils';

    let {
        meetingData,
        onSave,
        onDelete
    } = $props<{
        meetingData: {
            id?: string;
            start: string;
            end: string;
            subject: string;
            booking?: string;
        };
        onSave: (data: any) => void;
        onDelete?: () => void;
    }>();

    let localData = $state({ ...meetingData });

    $effect(() => {
        localData = { ...meetingData };
    });

    function copyBooking() {
        const parts = (localData.booking || '').split(';');
        const entry: Record<string, string> = {
            Dauer: formatDur(getDurationMin(localData.start, localData.end)),
            Projekt: parts[0] || '',
            Vorgang: parts[1] || '',
            'Tätigkeit': parts[2] || '',
            Bemerkung: parts[3] || localData.subject || ''
        };
        calendarStore.copiedBookingEntry = entry;
        navigator.clipboard.writeText(JSON.stringify(entry, null, 2)).catch(() => {});
    }

    function applyEntry(entry: Record<string, string>) {
        localData.booking = [
            entry.Projekt || '',
            entry.Vorgang || '',
            entry['Tätigkeit'] || '',
            entry.Bemerkung || ''
        ].join(';');
    }

    async function pasteBooking() {
        try {
            const text = await navigator.clipboard.readText();
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object') { applyEntry(parsed); return; }
        } catch {}
        if (calendarStore.copiedBookingEntry) applyEntry(calendarStore.copiedBookingEntry);
    }
</script>

<div class="space-y-4">
    <TimeEntry
        start={localData.start}
        end={localData.end}
        booking={localData.booking ?? ''}
        onStartChange={(v) => localData.start = v}
        onEndChange={(v) => localData.end = v}
        onBookingChange={(v) => localData.booking = v}
    />

    <div class="flex gap-2 mt-6">
        {#if onDelete}
            <button onclick={onDelete} class="p-3 rounded-xl transition-colors" title="Meeting löschen" style="color: var(--btn-checkout-text); background: var(--btn-checkout-bg); border: 1px solid var(--btn-checkout-border)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        {/if}
        <button onclick={copyBooking} class="p-3 rounded-xl transition-colors" title="Buchung kopieren" style="color: var(--text-muted); background: var(--bg-cell); border: 1px solid var(--border-main)">
            <Copy size={14} />
        </button>
        <button onclick={pasteBooking} class="p-3 rounded-xl transition-colors" title="Buchung einfügen" style="color: var(--text-muted); background: var(--bg-cell); border: 1px solid var(--border-main)">
            <ClipboardPaste size={14} />
        </button>
        <button onclick={() => onSave(localData)} class="flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-colors" style="background: var(--text-indigo); color: white">
            Speichern
        </button>
    </div>
</div>
