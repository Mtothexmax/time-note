
<script lang="ts">
    let { value, onChange, allowTyping = false } = $props<{ value: number; onChange: (v: number) => void; allowTyping?: boolean }>();

    let open = $state(false);
    let inputEl: HTMLInputElement | undefined = $state();
    const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const mins = ['00', '15', '30', '45'];

    const displayVal = $derived(`${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, '0')}h`);

    const selHour = $derived(Math.floor(value / 60));
    const selMin = $derived(value % 60);

    function pick(h: number, m: string) {
        onChange(h * 60 + parseInt(m));
        open = false;
    }

    function parseTyped(raw: string): number | null {
        const s = raw.replace(/h$/i, '').trim();
        if (s.includes(':')) {
            const [hStr, mStr] = s.split(':');
            const h = parseInt(hStr, 10), m = parseInt(mStr, 10);
            if (!isNaN(h) && !isNaN(m) && m >= 0 && m < 60) return h * 60 + m;
        } else {
            const n = parseFloat(s);
            if (!isNaN(n) && n >= 0) return Math.round(n * 60);
        }
        return null;
    }

    function onFocus() { open = true; }

    function onBlur() {
        if (allowTyping && inputEl) {
            const parsed = parseTyped(inputEl.value);
            if (parsed !== null && parsed > 0) onChange(parsed);
        }
        setTimeout(() => { open = false; }, 180);
    }

    function onOutsideClick(e: MouseEvent) {
        if (!(e.target as HTMLElement).closest('.tn-durationpicker')) open = false;
    }
</script>

<svelte:window onclick={onOutsideClick} />

<div class="tn-durationpicker" style="position: relative; display: inline-block;">
    <input bind:this={inputEl} type="text" value={displayVal} readonly={!allowTyping}
        class="duration-input"
        onfocus={onFocus}
        onblur={onBlur}
        style="background: var(--input-bg); border: 2px solid var(--input-border); color: var(--input-text); {allowTyping ? 'cursor: text;' : ''}">
    {#if open}
        <div class="grid-dropdown active">
            {#each hours as h}
                <div class="dur-row">
                    <span class="hour-label" class:selected={selHour === h && selMin === 0} role="button" tabindex="-1" onclick={() => pick(h, '00')}>{h}h</span>
                    {#each mins as m}
                        <span class="dur-cell" class:selected={selHour === h && selMin === parseInt(m)} role="button" tabindex="-1" onclick={() => pick(h, m)}>{m}</span>
                    {/each}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .duration-input {
        padding: 8px;
        border-radius: 8px;
        width: 100%;
        max-width: 100px;
        min-width: 50px;
        text-align: center;
        font-size: 15px;
        font-weight: 600;
        outline: none;
        letter-spacing: 1px;
        transition: border-color 0.2s;
        cursor: pointer;
        box-sizing: border-box;
    }
    .duration-input:focus { border-color: var(--text-indigo) !important; }
    .grid-dropdown {
        position: absolute;
        top: 115%;
        left: 0;
        z-index: 100;
        background: var(--bg-card);
        border: 1px solid var(--border-main);
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15);
        border-radius: 12px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .dur-row { display: grid; grid-template-columns: 32px repeat(4, 34px); gap: 5px; align-items: center; }
    .hour-label {
        font-size: 14px; font-weight: 800; text-align: right; padding-right: 6px;
        user-select: none; cursor: pointer; border-radius: 5px; padding: 4px 6px;
        transition: all 0.12s ease;
    }
    .hour-label:hover { background: var(--text-indigo) !important; color: white !important; }
    .hour-label.selected { background: var(--text-indigo); color: white; }
    .dur-cell {
        padding: 6px 0; font-size: 12px; font-weight: 500; text-align: center;
        cursor: pointer; border-radius: 5px;
        transition: all 0.12s ease; user-select: none;
        background: var(--bg-cell); color: var(--text-muted);
    }
    .dur-cell:hover { background: var(--text-indigo) !important; color: white !important; }
    .dur-cell.selected { background: var(--text-indigo); color: white; font-weight: 700; }
</style>
