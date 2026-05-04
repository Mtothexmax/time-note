
<script lang="ts">
    let { value, onChange } = $props<{ value: string; onChange: (v: string) => void }>();
</script>

<input 
    type="time" 
    value={value}
    class="rounded p-1 text-xs font-bold"
    style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text); width: auto; min-width: 80px;"
    oninput={(e) => onChange((e.target as HTMLInputElement).value)}
    onchange={(e) => onChange((e.target as HTMLInputElement).value)}
>
