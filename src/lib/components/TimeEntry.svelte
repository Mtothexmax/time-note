
<script lang="ts">
    import TimePicker from './TimePicker.svelte';
    import BookingFields from './BookingFields.svelte';

    let { start, end, booking, onStartChange, onEndChange, onBookingChange } = $props<{
        start: string;
        end: string;
        booking: string;
        onStartChange: (v: string) => void;
        onEndChange: (v: string) => void;
        onBookingChange: (v: string) => void;
    }>();
</script>

<div class="space-y-3" style="min-width: 0;">
    <div class="flex items-center gap-1" style="min-width: 0;">
        <TimePicker value={start} onChange={onStartChange} />
        <span style="color: var(--text-muted); font-size: 14px; font-weight: 600;">–</span>
        <TimePicker value={end} onChange={onEndChange} minTime={start} />
    </div>
    <BookingFields value={booking} onChange={onBookingChange} />
</div>
