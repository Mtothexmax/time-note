
<script lang="ts">
    import { Trash2, Copy, ClipboardPaste } from 'lucide-svelte';
    import BookingFields from './BookingFields.svelte';
    import { calendarStore } from '$lib/stores/calendarStore.svelte';

    let { entries, onSave } = $props<{
        entries: { key: string; value: string; isRegex?: boolean }[];
        onSave: (entries: { key: string; value: string; isRegex?: boolean }[]) => void;
    }>();

    let localEntries = $state([...entries]);

    function addEntry() {
        localEntries = [...localEntries, { key: '', value: '', isRegex: false }];
    }

    function removeEntry(index: number) {
        localEntries = localEntries.filter((_, i) => i !== index);
    }

    function copyEntry(entry: { key: string; value: string }) {
        const parts = (entry.value || '').split(';');
        const data: Record<string, string> = {
            Projekt:     parts[0] || '',
            Vorgang:     parts[1] || '',
            'Tätigkeit': parts[2] || '',
            Bemerkung:   parts[3] || '',
        };
        calendarStore.copiedBookingEntry = data;
        navigator.clipboard.writeText(JSON.stringify(data, null, 2)).catch(() => {});
    }

    function applyEntry(i: number, entry: Record<string, string>) {
        localEntries[i].value = [entry.Projekt || '', entry.Vorgang || '', entry['Tätigkeit'] || '', entry.Bemerkung || ''].join(';');
    }

    async function openPaste(i: number) {
        if (calendarStore.copiedBookingEntry) {
            applyEntry(i, calendarStore.copiedBookingEntry);
            return;
        }
        try {
            const text = await navigator.clipboard.readText();
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object') applyEntry(i, parsed);
        } catch {}
    }

    function toggleRegex(i: number) {
        localEntries[i].isRegex = !localEntries[i].isRegex;
    }

    function exportDictJSON() {
        const data = localEntries.map(e => ({ key: e.key, value: e.value, isRegex: e.isRegex }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dict-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function importDictJSON(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target?.result as string);
                if (Array.isArray(parsed)) {
                    localEntries = parsed.map((p: any) => ({ key: p.key || '', value: p.value || '', isRegex: p.isRegex ?? false }));
                }
            } catch { alert('Ungültige JSON-Datei'); }
        };
        reader.readAsText(input.files[0]);
        input.value = '';
    }

    let gridEl: HTMLDivElement | undefined = $state();

    $effect(() => {
        localEntries.length;
        const el = gridEl;
        if (!el) return;
        const raf = requestAnimationFrame(() => {
            const items = [...el.children] as HTMLElement[];
            items.forEach(item => item.style.minHeight = '');
            const max = Math.max(...items.map(item => item.offsetHeight));
            if (max > 0) items.forEach(item => item.style.minHeight = `${max}px`);
        });
        return () => cancelAnimationFrame(raf);
    });
</script>

<div class="space-y-4">
    <div class="grid gap-3" style="grid-template-columns: repeat(3, minmax(240px, 1fr));" bind:this={gridEl}>
        {#each localEntries as entry, i}
            <div class="p-3 rounded-xl flex flex-col" style="background: var(--modal-section-bg); border: 1px solid var(--modal-section-border); box-sizing: border-box; min-width: 0;">
                <div class="flex justify-end gap-1 mb-2">
                    <button onclick={() => copyEntry(entry)} class="p-1 rounded transition-colors" style="color: var(--text-muted)" title="Buchung kopieren">
                        <Copy size={11} />
                    </button>
                    <button onclick={() => openPaste(i)} class="p-1 rounded transition-colors" style="color: var(--text-muted)" title="Buchung einfügen">
                        <ClipboardPaste size={11} />
                    </button>
                    <button onclick={() => removeEntry(i)} class="p-1 rounded transition-colors" style="color: var(--text-muted)">
                        <Trash2 size={11} />
                    </button>
                </div>
                <div class="flex items-center gap-1 mb-2">
                    <input
                        type="text" bind:value={entry.key} placeholder="Meeting-Name"
                        class="flex-1 rounded-lg p-2 text-xs font-bold"
                        style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text); box-sizing: border-box;">
                    <button onclick={() => toggleRegex(i)} class="p-1.5 rounded-lg text-xs font-bold transition-colors flex-shrink-0" style="background: {entry.isRegex ? 'var(--text-indigo)' : 'var(--bg-card)'}; border: 1px solid var(--border-main); color: {entry.isRegex ? 'white' : 'var(--text-muted)'}; min-width: 30px; text-align: center;" title="Regex-Match umschalten">
                        .*
                    </button>
                </div>
                <BookingFields value={entry.value} onChange={(v) => entry.value = v} />
            </div>
        {/each}
        <div style="border:2px dashed var(--border-main);border-radius:12px;cursor:pointer;">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div onclick={addEntry} style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;text-align:center;color:var(--text-muted);font-size:12px;font-weight:700;height:100%;">
                + Eintrag
            </div>
        </div>
    </div>
    <div class="flex gap-2 mt-4">
        <button onclick={exportDictJSON} class="px-4 py-3 rounded-xl font-bold text-sm transition-colors" style="background: var(--bg-page); border: 1px solid var(--border-main); color: var(--text-muted)">
            Export JSON
        </button>
        <input type="file" id="dictJsonInput" accept=".json" class="hidden" onchange={importDictJSON}>
        <label for="dictJsonInput" class="cursor-pointer px-4 py-3 rounded-xl font-bold text-sm transition-colors" style="background: var(--bg-page); border: 1px solid var(--border-main); color: var(--text-muted)">
            Import JSON
        </label>
        <button onclick={() => onSave(localEntries)} class="flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-colors" style="background: var(--text-indigo); color: white">
            Speichern
        </button>
    </div>
</div>
