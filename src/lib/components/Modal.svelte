
<script lang="ts">
    import { X } from 'lucide-svelte';
    import { fade, scale } from 'svelte/transition';

    let { isOpen, title, onClose, children, titleValue, onTitleChange, widthClass = 'max-w-md' } = $props<{
        isOpen: boolean;
        title: string;
        onClose: () => void;
        children: any;
        titleValue?: string;
        onTitleChange?: (v: string) => void;
        widthClass?: string;
    }>();

    let titleInput: HTMLInputElement | undefined = $state();

    $effect(() => {
        if (titleInput) titleInput.focus();
    });

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            onClose();
        }
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
                    <input bind:this={titleInput} type="text" value={titleValue ?? ''} oninput={(e) => onTitleChange((e.target as HTMLInputElement).value)} placeholder="Titel" class="w-full p-0 border-0 outline-none" style="background: transparent; color: var(--text-primary); font-size: 1.25rem; font-weight: 700; margin-right: 8px;">
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
