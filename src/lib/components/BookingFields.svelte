
<script lang="ts">
    let { value, onChange } = $props<{ value: string; onChange: (v: string) => void }>();

    let parts = $state<string[]>(['', '', '', '']);
    let lastSent = $state('');

    function syncFromValue(v: string) {
        const p = (v || '').split(';');
        while (p.length < 4) p.push('');
        parts = p;
        lastSent = v || '';
    }

    $effect(() => {
        if (!lastSent) {
            syncFromValue(value);
        }
    });

    $effect(() => {
        if (value !== lastSent) {
            syncFromValue(value);
        }
    });

    function set(i: number, v: string) {
        parts[i] = v;
        const serialized = parts.join(';');
        lastSent = serialized;
        onChange(serialized);
    }
</script>

<div class="grid grid-cols-2 gap-x-2 gap-y-1.5" style="grid-template-columns: 1fr 1fr;">
    <div>
        <label class="block text-[9px] font-bold uppercase mb-0.5" style="color: var(--text-muted)">Projekt</label>
        <input type="text" value={parts[0]} oninput={(e) => set(0, (e.target as HTMLInputElement).value)} placeholder="Projekt" class="w-full p-2 rounded-lg text-xs font-mono" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
    </div>
    <div>
        <label class="block text-[9px] font-bold uppercase mb-0.5" style="color: var(--text-muted)">Vorgang</label>
        <input type="text" value={parts[1]} oninput={(e) => set(1, (e.target as HTMLInputElement).value)} placeholder="Vorgang" class="w-full p-2 rounded-lg text-xs font-mono" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
    </div>
    <div>
        <label class="block text-[9px] font-bold uppercase mb-0.5" style="color: var(--text-muted)">Tätigkeit</label>
        <input type="text" value={parts[2]} oninput={(e) => set(2, (e.target as HTMLInputElement).value)} placeholder="Tätigkeit" class="w-full p-2 rounded-lg text-xs font-mono" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
    </div>
    <div></div>
    <div class="col-span-2">
        <label class="block text-[9px] font-bold uppercase mb-0.5" style="color: var(--text-muted)">Bemerkung</label>
        <input type="text" value={parts[3]} oninput={(e) => set(3, (e.target as HTMLInputElement).value)} placeholder="Bemerkung" class="w-full p-2 rounded-lg text-xs font-mono" style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)">
    </div>
</div>
