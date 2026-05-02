
<script lang="ts">
    import Modal from './Modal.svelte';
    import CodeBlock from './CodeBlock.svelte';

    let { isOpen, onClose } = $props<{ isOpen: boolean; onClose: () => void }>();

    let activeTab = $state(0);
    const tabs = ['Tampermonkey Script', 'CSV Export Outlook'];

    const tampermonkeyCode = `// ==UserScript==
// @name         Time-Note JSON Importer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Import Time-Note JSON Export in ZEP
// @author       Time-Note
// @match        https://zep.example.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log('Time-Note JSON Importer geladen');
})();`;

    const psCode = `# PowerShell-Script: Outlook-Kalender CSV-Pfad in die Zwischenablage kopieren
param(
    [string]$Pfad = "$env:TEMP\\outlook-export.csv"
)

$Pfad | Set-Clipboard
Write-Host "Pfad kopiert: $Pfad"`;
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
