
<script lang="ts">
    import { Edit3 } from 'lucide-svelte';

    let { value, onChange } = $props<{
        value: string;
        placeholder?: string;
        onChange: (val: string) => void;
    }>();

    const labels = ['Forgang', 'Projekt', 'Vorgang', 'Tätigkeit', 'Bemerkung'];
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
        <div class="space-y-2">
            {#each labels as label, i}
                <div>
                    <label for="bf{i}" class="text-[9px] font-bold block mb-0.5" style="color: var(--text-secondary)">{label}</label>
                    <input id="bf{i}" type="text" bind:value={fields[i]} class="w-full rounded p-1.5 text-xs font-mono" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
                </div>
            {/each}
        </div>
        <div class="flex gap-2 mt-3">
            <button onclick={() => popupOpen = false} class="flex-1 py-2 rounded-lg text-xs font-bold" style="background: var(--input-bg); color: var(--text-secondary)">Abbruch</button>
            <button onclick={savePopup} class="flex-1 py-2 rounded-lg text-xs font-bold text-white" style="background: var(--text-indigo)">Übernehmen</button>
        </div>
    </div>
{/if}
