
<script lang="ts">
    let { value, onChange, minTime } = $props<{ value: string; onChange: (v: string) => void; minTime?: string }>();

    let open = $state(false);
    let inputEl: HTMLInputElement;
    const minutes = ['00', '15', '30', '45'];
    const displayVal = $derived(value ? value.split(':').slice(0, 2).join(':') : '');
    const selHour = $derived(displayVal.split(':')[0] ?? '');
    const selMin = $derived(displayVal.split(':')[1] ?? '');

    function toMinutes(t: string): number {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    function isDisabled(h: number, m: string): boolean {
        if (!minTime) return false;
        return toMinutes(`${String(h).padStart(2, '0')}:${m}`) < toMinutes(minTime);
    }

    function pick(h: number, m: string) {
        if (isDisabled(h, m)) return;
        const v = `${String(h).padStart(2, '0')}:${m}`;
        onChange(v);
        open = false;
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Backspace' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab' || e.key === 'Enter') return;
        if (e.key === 'Escape') { open = false; return; }
        if (!/^[0-9]$/.test(e.key)) { if (e.key.length === 1) e.preventDefault(); return; }
        e.preventDefault();
        let pos = inputEl.selectionStart ?? 0;
        if (pos === 2) pos = 3;
        if (pos >= 5) return;
        let arr = value.split('');
        arr[pos] = e.key;
        arr[2] = ':';
        const newVal = arr.join('');
        onChange(newVal);
        let next = pos + 1;
        if (next === 2) next = 3;
        requestAnimationFrame(() => inputEl.setSelectionRange(next, next));
    }

    function onFocus() {
        open = true;
    }

    function onOutsideClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (!target.closest('.tn-timepicker')) open = false;
    }
</script>

<svelte:window onclick={onOutsideClick} />

<div class="tn-timepicker" style="position: relative; display: inline-block;">
    <input
        bind:this={inputEl}
        type="text"
        value={displayVal}
        maxlength="5"
        class="time-input"
        onkeydown={onKeydown}
        onfocus={onFocus}
        onblur={() => { setTimeout(() => { open = false; }, 180); }}
        readonly={false}
        style="background: var(--input-bg); border: 2px solid var(--input-border); color: var(--input-text);"
    >
    {#if open}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="grid-dropdown active">
            <div class="column-group">
                {#each { length: 7 }, i}
                    {@const h = i + 7}
                    <div class="time-row">
                        <span class="hour-label" style="color: var(--text-primary)" role="button" tabindex="-1" onclick={() => pick(h, '00')}>{String(h).padStart(2, '0')}</span>
                        {#each minutes as m}
                            <span class="time-cell" class:selected={selHour === String(h).padStart(2, '0') && selMin === m} class:disabled={isDisabled(h, m)} role="button" tabindex="-1" onclick={() => pick(h, m)}>{m}</span>
                        {/each}
                    </div>
                {/each}
            </div>
            <div class="column-group">
                {#each { length: 7 }, i}
                    {@const h = i + 14}
                    <div class="time-row">
                        <span class="hour-label" style="color: var(--text-primary)" role="button" tabindex="-1" onclick={() => pick(h, '00')}>{String(h).padStart(2, '0')}</span>
                        {#each minutes as m}
                            <span class="time-cell" class:selected={selHour === String(h).padStart(2, '0') && selMin === m} class:disabled={isDisabled(h, m)} role="button" tabindex="-1" onclick={() => pick(h, m)}>{m}</span>
                        {/each}
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .time-input {
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
    .time-input:focus { border-color: var(--text-indigo) !important; }
    .grid-dropdown {
        position: absolute;
        top: 115%;
        left: 0;
        z-index: 100;
        background: var(--bg-card);
        border: 1px solid var(--border-main);
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        gap: 24px;
    }
    .column-group { display: flex; flex-direction: column; gap: 6px; }
    .time-row { display: grid; grid-template-columns: 32px repeat(4, 34px); gap: 5px; align-items: center; }
    .hour-label {
        font-size: 14px; font-weight: 800;
        text-align: right; padding-right: 6px;
        user-select: none;
    }
    .time-cell {
        padding: 6px 0; font-size: 12px; font-weight: 500; text-align: center;
        cursor: pointer; border-radius: 5px;
        transition: all 0.12s ease;
        user-select: none;
        background: var(--bg-cell);
        color: var(--text-muted);
    }
    .time-cell:hover { background: var(--text-indigo) !important; color: white !important; }
    .time-cell.selected {
        background: var(--text-indigo);
        color: white;
        font-weight: 700;
        box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.3);
    }
    .time-cell.disabled {
        visibility: hidden;
        pointer-events: none;
    }
</style>
