
<script lang="ts">
    let { code, language = '' } = $props<{ code: string; language?: string }>();
    let copied = $state(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(code);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = code;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        copied = true;
        setTimeout(() => copied = false, 1500);
    }
</script>

<div class="code-block" style="background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 8px; overflow: hidden;">
    <div class="flex items-center justify-between px-3 py-1.5" style="background: var(--border-main);">
        <span class="text-[10px] font-bold uppercase" style="color: var(--text-muted)">{language || 'Code'}</span>
        <button onclick={copy} class="text-[9px] font-bold px-2 py-0.5 rounded transition-colors" style="color: var(--text-muted); background: var(--input-bg);">
            {copied ? 'Kopiert!' : 'Kopieren'}
        </button>
    </div>
    <pre class="m-0 p-3 overflow-x-auto text-xs font-mono leading-relaxed" style="color: var(--text-primary); max-height: 300px; overflow-y: auto;"><code>{code}</code></pre>
</div>
