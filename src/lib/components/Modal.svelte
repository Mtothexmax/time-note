
<script lang="ts">
    import { X, ChevronDown } from 'lucide-svelte';
    import { fade, scale } from 'svelte/transition';

    import type { Snippet } from 'svelte';

    let { isOpen, title, onClose, children, titleValue, onTitleChange, widthClass = 'max-w-md', titleSnippet, dictEntries, onSelectDictEntry } = $props<{
        isOpen: boolean;
        title: string;
        onClose: () => void;
        children: any;
        titleValue?: string;
        onTitleChange?: (v: string) => void;
        widthClass?: string;
        titleSnippet?: Snippet;
        dictEntries?: { key: string; value: string }[];
        onSelectDictEntry?: (v: string) => void;
    }>();

    let titleInput: HTMLInputElement | undefined = $state();
    let dictPickerOpen = $state(false);

    $effect(() => {
        if (titleInput) titleInput.focus();
    });

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            if (dictPickerOpen) {
                dictPickerOpen = false;
            } else {
                onClose();
            }
        }
    }

    function pickDictEntry(entry: string) {
        onSelectDictEntry?.(entry);
        dictPickerOpen = false;
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
</script>

{#if isOpen}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        role="dialog"
        tabindex="-1"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
        onkeydown={handleKeydown}
        transition:fade={{ duration: 200 }}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="rounded-3xl shadow-2xl w-full {widthClass} flex flex-col"
            style="background: var(--bg-card); border: 1px solid var(--border-main); max-height: calc(100vh - 2rem);"
            onclick={(e) => e.stopPropagation()}
            transition:scale={{ duration: 200, start: 0.95 }}
        >
            <div class="flex justify-between items-start flex-shrink-0 px-6 pt-6 pb-4" style="min-height: 32px;">
                {#if onTitleChange}
                    <div class="flex items-center gap-1" style="min-width: 0; flex: 1; margin-right: 8px;">
                        <input bind:this={titleInput} type="text" value={titleValue ?? ''} oninput={(e) => onTitleChange((e.target as HTMLInputElement).value)} placeholder="Titel" class="w-full p-0 border-0 outline-none" style="background: transparent; color: var(--text-primary); font-size: 1.25rem; font-weight: 700;">
                        {#if dictEntries && dictEntries.length}
                            <button type="button" onclick={() => dictPickerOpen = true} class="flex-shrink-0 rounded-lg transition-colors" style="color: var(--text-muted); padding: 4px;" title="Aus Wörterbuch wählen" onmouseenter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'} onmouseleave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
                                <ChevronDown size={18} />
                            </button>
                        {/if}
                    </div>
                {:else if titleSnippet}
                    {@render titleSnippet()}
                {:else if title}
                    <h3 class="text-xl font-bold">{title}</h3>
                {:else}
                    <span></span>
                {/if}
                <button onclick={onClose} class="transition-colors flex-shrink-0" style="color: var(--text-muted)" onmouseenter={(e) => (e.target as HTMLElement).style.color = 'var(--text-secondary)'} onmouseleave={(e) => (e.target as HTMLElement).style.color = 'var(--text-muted)'}>
                    <X size={24} />
                </button>
            </div>

            <div class="overflow-y-auto px-6 pb-6">
                {@render children()}
            </div>
        </div>
    </div>
{/if}

{#if dictPickerOpen}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        role="dialog"
        tabindex="-1"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1100] p-4"
        onclick={() => dictPickerOpen = false}
        onkeydown={(e) => { if (e.key === 'Escape') dictPickerOpen = false; }}
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
                <h3 class="text-xl font-bold">Aus Wörterbuch wählen</h3>
                <button onclick={() => dictPickerOpen = false} class="transition-colors flex-shrink-0" style="color: var(--text-muted)" onmouseenter={(e) => (e.target as HTMLElement).style.color = 'var(--text-secondary)'} onmouseleave={(e) => (e.target as HTMLElement).style.color = 'var(--text-muted)'}>
                    <X size={24} />
                </button>
            </div>
            <div class="overflow-y-auto px-6 pb-6 flex-1">
                <div class="dict-picker-grid">
                    {#each dictEntries as entry}
                        <button type="button" class="dict-picker-card" onclick={() => pickDictEntry(entry.key)}>
                            <div class="dict-picker-card-title">{entry.key}</div>
                            {#each bookingParts(entry.value) as part}
                                {#if part.text}
                                    <div class="dict-picker-card-row">
                                        <span class="dict-picker-card-label">{part.label}</span>
                                        <span class="dict-picker-card-value">{part.text}</span>
                                    </div>
                                {/if}
                            {/each}
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .dict-picker-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 12px;
    }
    .dict-picker-card {
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
    .dict-picker-card:hover {
        border-color: var(--text-indigo);
        background: var(--bg-cell);
    }
    .dict-picker-card-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 4px;
        overflow-wrap: break-word;
    }
    .dict-picker-card-row {
        display: flex;
        gap: 6px;
        font-size: 11px;
        overflow-wrap: break-word;
    }
    .dict-picker-card-label {
        flex-shrink: 0;
        font-weight: 700;
        color: var(--text-muted);
    }
    .dict-picker-card-value {
        color: var(--text-secondary);
    }
</style>
