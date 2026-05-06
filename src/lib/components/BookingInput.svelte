
<script lang="ts">
    import { Edit3 } from 'lucide-svelte';

    let { value, onChange } = $props<{
        value: string;
        placeholder?: string;
        onChange: (val: string) => void;
    }>();

    const labels = ['Projekt', 'Vorgang', 'Tätigkeit', 'Bemerkung'];
    const fieldCount = labels.length;

    let popupOpen = $state(false);
    let fields = $state<string[]>([]);

    function openPopup() {
        const parts = (value || '').split(';');
        fields = [];
        for (let i = 0; i < fieldCount; i++) {
            fields[i] = parts[i] || '';
        }
        popupOpen = true;
    }

    function savePopup() {
        onChange(fields.join(';'));
        popupOpen = false;
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex gap-1 items-center">
    <input 
        type="text" 
        bind:value={value}
        placeholder="Buchungsnummer"
        class="flex-1 rounded p-1 text-xs font-mono"
        style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)"
        oninput={(e) => onChange((e.target as HTMLInputElement).value)}
    >
    <button onclick={openPopup} class="p-1 transition-colors" style="color: var(--text-muted)" title="Detailbearbeitung">
        <Edit3 size={12} />
    </button>
</div>

{#if popupOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-[9998] bg-transparent" onclick={() => popupOpen = false}></div>
    <div 
        class="fixed z-[9999] rounded-lg shadow-xl p-3 min-w-[300px]"
        style="background: var(--bg-card); border: 1px solid var(--border-main); top: 50%; left: 50%; transform: translate(-50%, -50%);"
    >
        <div class="text-[10px] font-bold uppercase mb-2" style="color: var(--text-muted)">Buchungsnummer</div>
        <div class="grid gap-2" style="grid-template-columns: 1fr 1fr;">
            <!-- Projekt (col 1) | Tätigkeit (col 2) -->
            <div>
                <label for="bf0" class="text-[9px] font-bold block mb-0.5" style="color: var(--text-secondary)">Projekt</label>
                <input id="bf0" type="text" bind:value={fields[0]} class="w-full rounded p-1.5 text-xs font-mono" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
            </div>
            <div>
                <label for="bf2" class="text-[9px] font-bold block mb-0.5" style="color: var(--text-secondary)">Tätigkeit</label>
                <input id="bf2" type="text" bind:value={fields[2]} class="w-full rounded p-1.5 text-xs font-mono" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
            </div>
            <!-- Vorgang (col 1, col 2 empty) -->
            <div>
                <label for="bf1" class="text-[9px] font-bold block mb-0.5" style="color: var(--text-secondary)">Vorgang</label>
                <input id="bf1" type="text" bind:value={fields[1]} class="w-full rounded p-1.5 text-xs font-mono" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
            </div>
            <div></div>
            <!-- Bemerkung (full width) -->
            <div style="grid-column: 1 / -1;">
                <label for="bf3" class="text-[9px] font-bold block mb-0.5" style="color: var(--text-secondary)">Bemerkung</label>
                <input id="bf3" type="text" bind:value={fields[3]} class="w-full rounded p-1.5 text-xs font-mono" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
            </div>
        </div>
        <div class="flex gap-2 mt-3">
            <button onclick={() => popupOpen = false} class="flex-1 py-2 rounded-lg text-xs font-bold" style="background: var(--input-bg); color: var(--text-secondary)">Abbruch</button>
            <button onclick={savePopup} class="flex-1 py-2 rounded-lg text-xs font-bold text-white" style="background: var(--text-indigo)">Übernehmen</button>
        </div>
    </div>
{/if}
