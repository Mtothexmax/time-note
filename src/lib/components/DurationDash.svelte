
<script lang="ts">
    import { toMinutes, getDurationMin, formatDur } from '$lib/utils/dateUtils';

    let { start, end, onEndChange } = $props<{
        start: string;
        end: string;
        onEndChange: (v: string) => void;
    }>();

    let durOpen = $state(false);
    let triggerEl: HTMLButtonElement | undefined = $state();
    let dropdownStyle = $state<{ left: string; top: string }>({ left: '0', top: '0' });
    const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const mins = ['00', '15', '30', '45'];

    const durationMin = $derived(Math.max(0, getDurationMin(start, end)));
    const durationLabel = $derived(`${formatDur(durationMin)}h`);
    const selHour = $derived(Math.floor(durationMin / 60));
    const selMin = $derived(durationMin % 60);

    function addMinutes(time: string, min: number): string {
        const total = ((toMinutes(time) + min) % 1440 + 1440) % 1440;
        return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }

    function pickDuration(h: number, m: string) {
        onEndChange(addMinutes(start, h * 60 + parseInt(m)));
        durOpen = false;
    }

    function toggleDur() {
        if (durOpen) { durOpen = false; return; }
        const rect = triggerEl!.getBoundingClientRect();
        dropdownStyle = { left: `${rect.left + rect.width / 2}px`, top: `${rect.bottom + 4}px` };
        durOpen = true;
    }

    function onOutsideClick(e: MouseEvent) {
        if (durOpen && !(e.target as HTMLElement).closest('.tn-durtrigger')) durOpen = false;
    }
</script>

<svelte:window onclickcapture={onOutsideClick} />

<div class="tn-durtrigger">
    <button bind:this={triggerEl} type="button" class="dur-trigger" onclick={toggleDur} title="Dauer wählen">
        <span class="dur-dash">–</span>
        <span class="dur-label">{durationLabel}</span>
    </button>
    {#if durOpen}
        <div class="grid-dropdown active" style="left: {dropdownStyle.left}; top: {dropdownStyle.top};">
            {#each hours as h}
                <div class="dur-row">
                    <span class="hour-label" class:selected={selHour === h && selMin === 0} role="button" tabindex="-1" onclick={() => pickDuration(h, '00')}>{h}h</span>
                    {#each mins as m}
                        <span class="dur-cell" class:selected={selHour === h && selMin === parseInt(m)} role="button" tabindex="-1" onclick={() => pickDuration(h, m)}>{m}</span>
                    {/each}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .dur-trigger {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0;
        flex-shrink: 0;
        transition: background 0.12s ease;
    }
    .dur-trigger:hover {
        background: var(--nav-hover);
    }
    .dur-dash {
        color: var(--text-muted);
        font-size: 14px;
        font-weight: 600;
        line-height: 1;
    }
    .dur-label {
        color: var(--text-muted);
        font-size: 8px;
        font-weight: 700;
        line-height: 1.2;
        margin-top: 1px;
        white-space: nowrap;
    }
    .grid-dropdown {
        position: fixed;
        transform: translateX(-50%);
        z-index: 9999;
        background: var(--bg-card);
        border: 1px solid var(--border-main);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
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
