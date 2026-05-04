
<script lang="ts">
    import Modal from './Modal.svelte';
    import CodeBlock from './CodeBlock.svelte';
    import tampermonkeyCode from '../../../static/tampermonkey.js?raw';
    import psCode from '../../../static/export-csv-path.ps1?raw';

    let { isOpen, onClose } = $props<{ isOpen: boolean; onClose: () => void }>();

    let activeTab = $state(0);
    const tabs = ['Tampermonkey Script', 'CSV Export Outlook'];
</script>

<Modal {isOpen} title="Info" {onClose}>
    <div class="flex gap-1 mb-4 border-b pb-2" style="border-color: var(--border-main)">
        {#each tabs as tab, i}
            <button 
                onclick={() => activeTab = i}
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                style="background: {activeTab === i ? 'var(--text-indigo)' : 'transparent'}; color: {activeTab === i ? 'white' : 'var(--text-secondary)'};"
            >{tab}</button>
        {/each}
    </div>

    <div style="height: 400px; overflow-y: auto;">
        {#if activeTab === 0}
            <div class="space-y-3">
                <p class="text-xs leading-relaxed" style="color: var(--text-secondary)">
                    Mit <a href="https://www.tampermonkey.net/" target="_blank" rel="noopener" class="underline" style="color: var(--text-indigo)">Tampermonkey</a> 
                    kannst du die exportierte JSON-Datei automatisiert in ZEP importieren.
                </p>
                <CodeBlock code={tampermonkeyCode} language="JavaScript" />
            </div>
        {:else}
            <div class="space-y-3">
                <p class="text-xs leading-relaxed" style="color: var(--text-secondary)">
                    Mit diesem PowerShell-Script kopierst du den Pfad zur exportierten Outlook-Kalender-CSV 
                    in die Zwischenablage. Nach Ausführung kann der Pfad mit Strg+V eingefügt werden.
                </p>
                <CodeBlock code={psCode} language="PowerShell" />
            </div>
        {/if}
    </div>
</Modal>
