
<script lang="ts">
    import { History, X } from 'lucide-svelte';
    import { fade, scale } from 'svelte/transition';
    import { calendarStore } from '$lib/stores/calendarStore.svelte';
    import { highlightParts } from '$lib/utils/highlight';

    let {
        onSelect,
        buttonClass = 'p-3 rounded-xl transition-colors',
        buttonStyle = 'color: var(--text-muted); background: var(--bg-cell); border: 1px solid var(--border-main)',
        iconSize = 14
    } = $props<{
        onSelect: (booking: string) => void;
        buttonClass?: string;
        buttonStyle?: string;
        iconSize?: number;
    }>();

    let open = $state(false);
    let searchInput: HTMLInputElement | undefined = $state();
    let searchQuery = $state('');

    $effect(() => {
        if (open && searchInput) searchInput.focus();
    });

    function openPicker() {
        searchQuery = '';
        open = true;
    }

    function closePicker() {
        open = false;
    }

    function bookingParts(value: string) {
        const parts = (value || '').split(';');
        return [
            { label: 'Projekt', text: parts[0] || '' },
            { label: 'Vorgang', text: parts[1] || '' },
            { label: 'Tätigkeit', text: parts[2] || '' },
            { label: 'Bemerkung', text: parts[3] || '' }
        ];
    }

    const filteredHistory = $derived.by(() => {
        const all = calendarStore.getBookingHistory();
        const q = searchQuery.trim().toLowerCase();
        if (!q) return all;
        return all.filter(b => b.toLowerCase().includes(q));
    });

    function pick(booking: string) {
        onSelect(booking);
        closePicker();
    }
</script>

<button type="button" onclick={openPicker} class={buttonClass} style={buttonStyle} title="Frühere Buchungen">
    <History size={iconSize} />
</button>

{#if open}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        role="dialog"
        tabindex="-1"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1100] p-4"
        onclick={closePicker}
        onkeydown={(e) => { if (e.key === 'Escape') closePicker(); }}
        transition:fade={{ duration: 150 }}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="rounded-3xl shadow-2xl flex flex-col"
            style="background: var(--bg-card); border: 1px solid var(--border-main); width: 95vw; height: 90vh;"
            onclick={(e) => e.stopPropagation()}
            transition:scale={{ duration: 150, start: 0.97 }}
        >
            <div class="flex justify-between items-center flex-shrink-0 px-6 pt-6 pb-4">
                <h3 class="text-xl font-bold">Frühere Buchungen</h3>
                <button onclick={closePicker} class="transition-colors flex-shrink-0" style="color: var(--text-muted)" onmouseenter={(e) => (e.target as HTMLElement).style.color = 'var(--text-secondary)'} onmouseleave={(e) => (e.target as HTMLElement).style.color = 'var(--text-muted)'}>
                    <X size={24} />
                </button>
            </div>
            <div class="px-6 pb-4 flex-shrink-0">
                <input
                    bind:this={searchInput}
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Suchen…"
                    class="w-full rounded-lg p-2.5 text-sm outline-none"
                    style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text);"
                >
            </div>
            <div class="overflow-y-auto px-6 pb-6 flex-1">
                {#if filteredHistory.length}
                    <div class="history-grid">
                        {#each filteredHistory as booking}
                            <button type="button" class="history-card" onclick={() => pick(booking)}>
                                {#each bookingParts(booking) as part}
                                    {#if part.text}
                                        <div class="history-card-row">
                                            <span class="history-card-label">{part.label}</span>
                                            <span class="history-card-value">
                                                {#each highlightParts(part.text, searchQuery) as seg}
                                                    {#if seg.match}<mark class="hl-mark">{seg.text}</mark>{:else}{seg.text}{/if}
                                                {/each}
                                            </span>
                                        </div>
                                    {/if}
                                {/each}
                            </button>
                        {/each}
                    </div>
                {:else}
                    <div class="text-sm" style="color: var(--text-muted)">Keine Treffer</div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .history-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 12px;
    }
    .history-card {
        display: flex;
        flex-direction: column;
        gap: 4px;
        text-align: left;
        padding: 12px;
        border-radius: 12px;
        cursor: pointer;
        background: var(--modal-section-bg);
        border: 1px solid var(--modal-section-border);
        transition: all 0.12s ease;
    }
    .history-card:hover {
        border-color: var(--text-indigo);
        background: var(--bg-cell);
    }
    .history-card-row {
        display: flex;
        gap: 6px;
        font-size: 11px;
        overflow-wrap: break-word;
    }
    .history-card-label {
        flex-shrink: 0;
        font-weight: 700;
        color: var(--text-muted);
    }
    .history-card-value {
        color: var(--text-secondary);
    }
    .hl-mark {
        background: var(--text-indigo);
        color: white;
        border-radius: 3px;
        padding: 0 2px;
        font-weight: 700;
    }
</style>
