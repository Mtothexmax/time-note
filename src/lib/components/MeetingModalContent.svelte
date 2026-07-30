
<script lang="ts">
    import { Copy, ClipboardPaste, MoreHorizontal, BookPlus, Repeat, ChevronRight, ChevronLeft } from 'lucide-svelte';
    import TimeEntry from './TimeEntry.svelte';
    import BookingHistoryPicker from './BookingHistoryPicker.svelte';
    import { calendarStore } from '$lib/stores/calendarStore.svelte';
    import { getDurationMin, formatDur, addMonths, type RepeatType } from '$lib/utils/dateUtils';

    let {
        meetingData,
        dateStr,
        onSave,
        onDelete,
        onDeleteFuture
    } = $props<{
        meetingData: {
            id?: string;
            start: string;
            end: string;
            subject: string;
            booking?: string;
        };
        dateStr: string;
        onSave: (data: any) => void;
        onDelete?: () => void;
        onDeleteFuture?: () => void;
    }>();

    let localData = $state({ ...meetingData });
    let repeatType = $state<'none' | RepeatType>('none');
    let repeatUntil = $state('');

    $effect(() => {
        localData = { ...meetingData };
        repeatType = 'none';
        repeatUntil = '';
    });

    const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
        { value: 'weekdays', label: 'Mo–Fr' },
        { value: 'daily', label: 'Täglich' },
        { value: 'weekly', label: 'Wöchentlich' },
        { value: 'biweekly', label: 'Alle 2 Wochen' }
    ];

    const repeatLabel = $derived(REPEAT_OPTIONS.find(o => o.value === repeatType)?.label ?? '');

    function handleSave() {
        onSave({
            ...localData,
            repeat: repeatType !== 'none' && repeatUntil ? { type: repeatType, until: repeatUntil } : null
        });
    }

    let deleteCtx = $state<{ x: number; y: number } | null>(null);

    function openDeleteCtx(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        deleteCtx = { x: e.clientX, y: e.clientY };
    }

    let moreMenu = $state<{ x: number; y: number } | null>(null);
    let moreMenuView = $state<'main' | 'repeat'>('main');

    function openMoreMenu(e: MouseEvent) {
        moreMenuView = 'main';
        moreMenu = { x: e.clientX, y: e.clientY };
    }

    function closeMoreMenu() {
        moreMenu = null;
    }

    function saveToDictionary() {
        const subject = (localData.subject || '').trim();
        if (!subject) { closeMoreMenu(); return; }
        calendarStore.bookingDict[subject] = (localData.booking || '').trim();
        calendarStore.save();
        closeMoreMenu();
    }

    function pickRepeat(value: RepeatType) {
        repeatType = value;
        repeatUntil = addMonths(dateStr, 3);
        closeMoreMenu();
    }

    function clearRepeat() {
        repeatType = 'none';
        repeatUntil = '';
    }

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

    {#if !localData.id && repeatType !== 'none'}
        <div class="flex items-center gap-1.5 text-[10px] font-bold" style="color: var(--text-indigo)">
            <Repeat size={11} />
            {repeatLabel} bis {repeatUntil}
            <button type="button" onclick={clearRepeat} class="transition-colors" style="color: var(--text-muted)" title="Wiederholung entfernen">
                ×
            </button>
        </div>
    {/if}

    <div class="flex gap-2 mt-6">
        {#if onDelete}
            <button
                onclick={onDelete}
                oncontextmenu={openDeleteCtx}
                class="p-3 rounded-xl transition-colors"
                title="Meeting löschen · Rechtsklick für weitere Optionen"
                style="color: var(--btn-checkout-text); background: var(--btn-checkout-bg); border: 1px solid var(--btn-checkout-border)"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        {/if}
        <button onclick={openMoreMenu} class="p-3 rounded-xl transition-colors" title="Weitere Optionen" style="color: var(--text-muted); background: var(--bg-cell); border: 1px solid var(--border-main)">
            <MoreHorizontal size={14} />
        </button>
        <BookingHistoryPicker onSelect={(b) => localData.booking = b} iconSize={14} />
        <button onclick={copyBooking} class="p-3 rounded-xl transition-colors" title="Buchung kopieren" style="color: var(--text-muted); background: var(--bg-cell); border: 1px solid var(--border-main)">
            <Copy size={14} />
        </button>
        <button onclick={pasteBooking} class="p-3 rounded-xl transition-colors" title="Buchung einfügen" style="color: var(--text-muted); background: var(--bg-cell); border: 1px solid var(--border-main)">
            <ClipboardPaste size={14} />
        </button>
        <button onclick={handleSave} class="flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-colors" style="background: var(--text-indigo); color: white">
            Speichern
        </button>
    </div>
</div>

{#if deleteCtx}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-[9998]" onclick={() => deleteCtx = null}></div>
    <div
        class="fixed z-[9999] rounded-lg shadow-xl py-1 min-w-[220px]"
        style="top: {deleteCtx.y}px; left: {deleteCtx.x}px; background: var(--bg-card); border: 1px solid var(--border-main);"
    >
        <div class="px-2 py-1 text-[9px] font-black uppercase tracking-wider" style="color: var(--text-muted)">Löschen</div>
        <div style="border-top: 1px solid var(--border-main); margin: 2px 0;"></div>
        {#if onDeleteFuture}
            <button
                class="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors"
                style="color: var(--btn-checkout-text)"
                title="Löscht alle Termine mit dem gleichen Namen ab diesem Datum"
                onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'}
                onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                onclick={() => { onDeleteFuture!(); deleteCtx = null; }}
            >
                Ab hier alle gleichen löschen
            </button>
        {/if}
    </div>
{/if}

{#if moreMenu}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-[9998]" onclick={closeMoreMenu}></div>
    <div
        class="fixed z-[9999] rounded-lg shadow-xl py-1 min-w-[210px]"
        style="top: {moreMenu.y}px; left: {moreMenu.x}px; background: var(--bg-card); border: 1px solid var(--border-main);"
    >
        {#if moreMenuView === 'main'}
            <button
                class="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors"
                style="color: var(--text-primary)"
                onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'}
                onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                onclick={saveToDictionary}
            >
                <BookPlus size={12} /> Ins Wörterbuch übertragen
            </button>
            {#if !localData.id}
                <button
                    class="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors"
                    style="color: var(--text-primary)"
                    onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'}
                    onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    onclick={() => moreMenuView = 'repeat'}
                >
                    <Repeat size={12} /> Wiederholen
                    <ChevronRight size={12} style="margin-left: auto;" />
                </button>
            {/if}
        {:else}
            <button
                class="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] font-bold transition-colors"
                style="color: var(--text-muted)"
                onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'}
                onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                onclick={() => moreMenuView = 'main'}
            >
                <ChevronLeft size={12} /> Zurück
            </button>
            <div style="border-top: 1px solid var(--border-main); margin: 2px 0;"></div>
            {#each REPEAT_OPTIONS as opt}
                <button
                    class="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors"
                    style="color: var(--text-primary)"
                    onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'}
                    onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    onclick={() => pickRepeat(opt.value)}
                >
                    {opt.label}
                </button>
            {/each}
        {/if}
    </div>
{/if}
