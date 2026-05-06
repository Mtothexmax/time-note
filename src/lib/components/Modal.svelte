
<script lang="ts">
    import { X } from 'lucide-svelte';
    import { fade, scale } from 'svelte/transition';

    let { isOpen, title, onClose, children } = $props<{
        isOpen: boolean;
        title: string;
        onClose: () => void;
        children: any;
    }>();

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
            class="p-6 rounded-3xl shadow-2xl w-full max-w-md"
            style="background: var(--bg-card); border: 1px solid var(--border-main);"
            onclick={(e) => e.stopPropagation()}
            transition:scale={{ duration: 200, start: 0.95 }}
        >
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-bold">{title}</h3>
                <button onclick={onClose} class="transition-colors" style="color: var(--text-muted)" onmouseenter={(e) => (e.target as HTMLElement).style.color = 'var(--text-secondary)'} onmouseleave={(e) => (e.target as HTMLElement).style.color = 'var(--text-muted)'}>
                    <X size={24} />
                </button>
            </div>
            
            {@render children()}
        </div>
    </div>
{/if}
