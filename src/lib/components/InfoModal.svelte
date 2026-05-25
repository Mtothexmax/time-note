
<script lang="ts">
    import Modal from './Modal.svelte';
    import CodeBlock from './CodeBlock.svelte';
    import tampermonkeyCode from '$lib/tampermonkey.js?raw';
    import psCode from '$lib/export-csv-path.ps1?raw';
    import { calendarStore } from '$lib/stores/calendarStore.svelte';
    import { browser } from '$app/environment';

    let { isOpen, onClose } = $props<{ isOpen: boolean; onClose: () => void }>();

    let activeTab = $state(0);

    const UNLOCK_KEY = 'tn_settings_unlocked';
    let settingsUnlocked = $state(browser && localStorage.getItem(UNLOCK_KEY) === '1');

    const baseTabs = ['Tampermonkey Script', 'CSV Export Outlook'];
    const tabs = $derived(settingsUnlocked ? [...baseTabs, 'Einstellungen'] : baseTabs);

    let oClickCount = $state(0);
    let oClickTimer: ReturnType<typeof setTimeout> | null = null;

    function handleOClick() {
        oClickCount += 1;
        if (oClickTimer) clearTimeout(oClickTimer);
        if (oClickCount >= 3) {
            oClickCount = 0;
            settingsUnlocked = true;
            if (browser) localStorage.setItem(UNLOCK_KEY, '1');
            activeTab = tabs.length; // will be settings tab index after derived updates
        } else {
            oClickTimer = setTimeout(() => { oClickCount = 0; }, 1500);
        }
    }
</script>

{#snippet infoTitle()}
    <h3 class="text-xl font-bold">Inf<span
        onclick={handleOClick}
        style="cursor: default; user-select: none;"
        role="presentation"
    >o</span></h3>
{/snippet}

<Modal {isOpen} title="" titleSnippet={infoTitle} {onClose}>
    <div class="flex gap-1 mb-4 border-b pb-2" style="border-color: var(--border-main)">
        {#each tabs as tab, i}
            <button
                onclick={() => activeTab = i}
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                style="background: {activeTab === i ? 'var(--text-indigo)' : 'transparent'}; color: {activeTab === i ? 'white' : 'var(--text-secondary)'};"
            >{tab}</button>
        {/each}
    </div>

    <div style="height: 450px; overflow-y: auto;">
        {#if activeTab === 0}
            <div class="space-y-3">
                <p class="text-xs leading-relaxed" style="color: var(--text-secondary)">
                    Mit <a href="https://www.tampermonkey.net/" target="_blank" rel="noopener" class="underline" style="color: var(--text-indigo)">Tampermonkey</a>
                    kannst du die exportierte JSON-Datei automatisiert in ZEP importieren.
                </p>
                <CodeBlock code={tampermonkeyCode} language="JavaScript" />
            </div>
        {:else if activeTab === 1}
            <div class="space-y-3">
                <p class="text-xs leading-relaxed" style="color: var(--text-secondary)">
                    Mit diesem PowerShell-Script kopierst du den Pfad zur exportierten Outlook-Kalender-CSV
                    in die Zwischenablage. Nach Ausführung kann der Pfad mit Strg+V eingefügt werden.
                </p>
                <CodeBlock code={psCode} language="PowerShell" />
            </div>
        {:else if activeTab === 2 && settingsUnlocked}
            <div class="space-y-4">
                <p class="text-xs leading-relaxed" style="color: var(--text-secondary)">
                    Erweiterte Einstellungen
                </p>
                <label class="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        bind:checked={calendarStore.checkinEnabled}
                        onchange={() => calendarStore.save()}
                        class="w-4 h-4 rounded"
                        style="accent-color: var(--text-indigo)"
                    >
                    <span class="text-sm font-medium" style="color: var(--text-primary)">Einchecken-Funktion aktivieren</span>
                </label>
                <p class="text-xs" style="color: var(--text-muted)">
                    Wenn deaktiviert, ist der Einchecken-Button ausgeblendet.
                </p>
            </div>
        {/if}
    </div>
</Modal>
