<script lang="ts">
    import { fieldHistory } from "$lib/stores/fieldHistory.svelte";

    let { value, onChange } = $props<{
        value: string;
        onChange: (v: string) => void;
    }>();

    const uid = Math.random().toString(36).slice(2, 8);

    let parts = $state<string[]>(["", "", "", ""]);
    let lastSent = $state("");

    function syncFromValue(v: string) {
        const p = (v || "").split(";");
        while (p.length < 4) p.push("");
        parts = p;
        lastSent = v || "";
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
        const serialized = parts.join(";");
        lastSent = serialized;
        onChange(serialized);
    }

    const FIELDS = ["projekt", "vorgang", "taetigkeit", "bemerkung"];

    function onBlur(i: number) {
        fieldHistory.add(FIELDS[i], parts[i]);
    }
</script>

<div
    class="grid grid-cols-2 gap-x-2 gap-y-1.5"
    style="grid-template-columns: 1fr 1fr;"
>
    <div>
        <label
            class="block text-[9px] font-bold uppercase mb-0.5"
            style="color: var(--text-muted)">Projekt</label
        >
        <input
            type="text"
            value={parts[0]}
            oninput={(e) => set(0, (e.target as HTMLInputElement).value)}
            onblur={() => onBlur(0)}
            placeholder="Projekt"
            list="tn-hist-projekt-{uid}"
            class="w-full p-2 rounded-lg text-xs font-mono"
            style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)"
        />
        <datalist id="tn-hist-projekt-{uid}">
            {#each fieldHistory.get("projekt") as opt}
                <option value={opt}></option>
            {/each}
        </datalist>
    </div>
    <div>
        <label
            class="block text-[9px] font-bold uppercase mb-0.5"
            style="color: var(--text-muted)"
        >
            Vorgang

            <span  title="Mit #<Nummer> (z.B. #333333) wird im ZEP-Vorgang-Dropdown nach einer Option gesucht, deren Text diese Nummer enthält – entspricht der Suche im Dropdown."
                style="
    display: inline-block;
    cursor: help;
    font-style: normal;
    font-weight: normal;
    text-transform: none;
    font-size: 10px;
    opacity: 0.7;
    margin-left: 2px;
    margin-top: -5px;
    vertical-align: middle;"
            >
                (ℹ)</span
            >
        </label>
        <input
            type="text"
            value={parts[1]}
            oninput={(e) => set(1, (e.target as HTMLInputElement).value)}
            onblur={() => onBlur(1)}
            placeholder="Vorgang"
            list="tn-hist-vorgang-{uid}"
            class="w-full p-2 rounded-lg text-xs font-mono"
            style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)"
        />
        <datalist id="tn-hist-vorgang-{uid}">
            {#each fieldHistory.get("vorgang") as opt}
                <option value={opt}></option>
            {/each}
        </datalist>
    </div>
    <div>
        <label
            class="block text-[9px] font-bold uppercase mb-0.5"
            style="color: var(--text-muted)">Tätigkeit</label
        >
        <input
            type="text"
            value={parts[2]}
            oninput={(e) => set(2, (e.target as HTMLInputElement).value)}
            onblur={() => onBlur(2)}
            placeholder="Tätigkeit"
            list="tn-hist-taetigkeit-{uid}"
            class="w-full p-2 rounded-lg text-xs font-mono"
            style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)"
        />
        <datalist id="tn-hist-taetigkeit-{uid}">
            {#each fieldHistory.get("taetigkeit") as opt}
                <option value={opt}></option>
            {/each}
        </datalist>
    </div>
    <div></div>
    <div class="col-span-2">
        <label
            class="block text-[9px] font-bold uppercase mb-0.5"
            style="color: var(--text-muted)">Bemerkung</label
        >
        <input
            type="text"
            value={parts[3]}
            oninput={(e) => set(3, (e.target as HTMLInputElement).value)}
            placeholder="Bemerkung"
            class="w-full p-2 rounded-lg text-xs font-mono"
            style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)"
        />
    </div>
</div>
