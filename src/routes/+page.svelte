
<script lang="ts">
    import Header from '$lib/components/Header.svelte';
    import CalendarGrid from '$lib/components/CalendarGrid.svelte';
    import Modal from '$lib/components/Modal.svelte';
    import MeetingModalContent from '$lib/components/MeetingModalContent.svelte';
    import WorkModalContent from '$lib/components/WorkModalContent.svelte';
    import BookingInput from '$lib/components/BookingInput.svelte';
    import { onMount } from 'svelte';
    import { calendarStore, type ManualMeeting, type CSVEvent, type WorkInterval } from '$lib/stores/calendarStore.svelte';
    import { formatDate } from '$lib/utils/dateUtils';

    onMount(() => {
        // Small delay ensures Tampermonkey's unsafeWindow listener is attached first
        setTimeout(() => calendarStore.dispatchDayEvent(formatDate(new Date())), 300);
    });

    type MeetingModalData = ManualMeeting & { timeInfo?: string; };

    let meetingModal = $state({
        isOpen: false,
        title: '',
        isManual: false,
        dateStr: '',
        data: { id: '', start: '', end: '', subject: '', booking: '', timeInfo: '' } as MeetingModalData
    });

    let workModal = $state({
        isOpen: false,
        dateStr: '',
        intervals: [] as any[]
    });

    function openMeetingModal(ev: any) {
        const p = ev["Start Date"].split('-');
        const evDateStr = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        meetingModal = {
            isOpen: true,
            title: ev.Subject,
            isManual: false,
            dateStr: evDateStr,
            data: {
                id: ev.id,
                start: ev["Start Time"],
                end: ev["End Time"],
                subject: ev.Subject,
                booking: calendarStore.bookings[ev.id] || '',
                timeInfo: `${ev["Start Time"]} - ${ev["End Time"]}`
            }
        };
    }

    function openManualModal(dateStr: string, mId?: string, startTime?: string, endTime?: string) {
        let data: ManualMeeting = { id: '', start: startTime || '09:00', end: endTime || '10:00', subject: '', booking: '' };
        if (mId) {
            const m = calendarStore.manualMeetings[dateStr]?.find(x => x.id === mId);
            if (m) data = { ...m, booking: m.booking || '' };
        }
        meetingModal = {
            isOpen: true,
            title: mId ? 'Meeting bearbeiten' : 'Neues Meeting',
            isManual: true,
            dateStr,
            data: { ...data, timeInfo: '' }
        };
    }

    function openWorkModal(dateStr: string) {
        workModal = {
            isOpen: true,
            dateStr,
            intervals: calendarStore.workData[dateStr] ? JSON.parse(JSON.stringify(calendarStore.workData[dateStr])) : [{ start: "08:00", end: "16:30", booking: "" }]
        };
    }

    function saveMeeting(data: any) {
        if (meetingModal.isManual) {
            const m = {
                id: data.id || 'm-' + Date.now(),
                start: data.start,
                end: data.end,
                subject: data.subject || "Meeting",
                booking: data.booking.trim()
            };
            if (!calendarStore.manualMeetings[meetingModal.dateStr]) {
                calendarStore.manualMeetings[meetingModal.dateStr] = [];
            }
            if (data.id) {
                const idx = calendarStore.manualMeetings[meetingModal.dateStr].findIndex(x => x.id === data.id);
                calendarStore.manualMeetings[meetingModal.dateStr][idx] = m;
            } else {
                calendarStore.manualMeetings[meetingModal.dateStr].push(m);
            }
        } else if (data.id) {
            const ev = calendarStore.events.find(e => e.id === data.id);
            if (ev) {
                ev["Start Time"] = data.start;
                ev["End Time"] = data.end;
                ev.Subject = data.subject || ev.Subject;
            }
            const val = data.booking.trim();
            if (val) {
                calendarStore.bookings[data.id] = val;
            } else {
                delete calendarStore.bookings[data.id];
            }
        }
        calendarStore.save();
        if (meetingModal.dateStr) calendarStore.dispatchDayEvent(meetingModal.dateStr);
        meetingModal.isOpen = false;
    }

    function deleteMeeting() {
        if (meetingModal.data.id) {
            if (meetingModal.isManual && meetingModal.dateStr) {
                calendarStore.manualMeetings[meetingModal.dateStr] = calendarStore.manualMeetings[meetingModal.dateStr].filter(x => x.id !== meetingModal.data.id);
            } else {
                calendarStore.events = calendarStore.events.filter(e => e.id !== meetingModal.data.id);
                delete calendarStore.bookings[meetingModal.data.id];
            }
            calendarStore.save();
            if (meetingModal.dateStr) calendarStore.dispatchDayEvent(meetingModal.dateStr);
            meetingModal.isOpen = false;
        }
    }

    function saveWork(intervals: any[]) {
        calendarStore.workData[workModal.dateStr] = intervals.map(i => ({ ...i }));
        calendarStore.save();
        if (workModal.dateStr) calendarStore.dispatchDayEvent(workModal.dateStr);
        workModal.isOpen = false;
    }

    let overlapMenuEvents = $state<{ title: string; time: string; date: string; style: string; onClick: () => void }[]>([]);
    let overlapMenuPos = $state({ x: 0, y: 0 });
    let overlapMenuOpen = $state(false);

    function openOverlapMenu(events: any[], x: number, y: number) {
        overlapMenuEvents = events;
        overlapMenuPos = { x, y };
        overlapMenuOpen = true;
    }

    function closeOverlapMenu() {
        overlapMenuOpen = false;
    }

    function handleOverlapItemClick(fn: () => void) {
        overlapMenuOpen = false;
        fn();
    }

    let dictOpen = $state(false);
    let dictEntries = $state<{ key: string; value: string }[]>([]);

    function syncDict() {
        const obj: Record<string, string> = {};
        for (const e of dictEntries) {
            if (e.key.trim()) obj[e.key.trim()] = e.value.trim();
        }
        calendarStore.bookingDict = obj;
        calendarStore.save();
    }

    function addDictEntry() {
        dictEntries = [...dictEntries, { key: '', value: '' }];
    }

    function removeDictEntry(index: number) {
        dictEntries = dictEntries.filter((_, i) => i !== index);
    }

    function openDict() {
        dictEntries = Object.entries(calendarStore.bookingDict).length > 0
            ? Object.entries(calendarStore.bookingDict).map(([k, v]) => ({ key: k, value: v }))
            : [{ key: '', value: '' }];
        dictOpen = true;
    }
</script>

<div class="w-full p-4 h-screen flex flex-col overflow-hidden">
    <Header onOpenBookingDict={openDict} />

    <CalendarGrid 
        onOpenMeeting={openMeetingModal}
        onOpenWork={openWorkModal}
        onOpenManual={openManualModal}
        onOverlapMenu={openOverlapMenu}
    />
</div>

<Modal 
    isOpen={meetingModal.isOpen} 
    title={meetingModal.title} 
    onClose={() => meetingModal.isOpen = false}
>
    <MeetingModalContent 
        isManual={meetingModal.isManual}
        meetingData={meetingModal.data}
        onSave={saveMeeting}
        onDelete={deleteMeeting}
    />
</Modal>

{#if overlapMenuOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-[9998] bg-transparent" onclick={closeOverlapMenu}></div>
    <div 
        class="fixed z-[9999] rounded-lg shadow-xl min-w-[180px] max-w-[260px] py-1"
        style="top: {overlapMenuPos.y}px; left: {overlapMenuPos.x}px; background: var(--bg-card); border: 1px solid var(--border-main);"
    >
        <div class="px-2 py-1 text-[9px] font-black uppercase tracking-wider" style="color: var(--text-muted)">Termine</div>
        {#each overlapMenuEvents as oe}
            <button 
                class="w-full text-left px-2 py-1.5 flex flex-col gap-0.5 transition-colors"
                style="color: var(--text-primary)"
                onmouseenter={(e) => (e.target as HTMLElement).style.background = 'var(--nav-hover)'}
                onmouseleave={(e) => (e.target as HTMLElement).style.background = 'transparent'}
                onclick={() => handleOverlapItemClick(oe.onClick)}
            >
                <span class="text-[10px] font-semibold {oe.style}">{oe.title}</span>
                <span class="text-[9px]" style="color: var(--text-secondary)">{oe.time} · {oe.date}</span>
            </button>
        {/each}
    </div>
{/if}

<Modal 
    isOpen={workModal.isOpen} 
    title="Präsenzzeit" 
    onClose={() => workModal.isOpen = false}
>
    <WorkModalContent 
        intervals={workModal.intervals}
        onSave={saveWork}
    />
</Modal>

<Modal 
    isOpen={dictOpen} 
    title="Buchungsnummern" 
    onClose={() => { syncDict(); dictOpen = false; }}
>
    <div class="space-y-2 max-h-80 overflow-y-auto">
        {#each dictEntries as entry, i}
            <div class="flex gap-2 items-center">
                <input 
                    type="text" bind:value={entry.key} placeholder="Meeting-Name"
                    class="flex-1 rounded-lg p-2 text-xs font-bold"
                    style="background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text)"
                >
                <div class="flex-1 min-w-0">
                    <BookingInput value={entry.value} onChange={(v) => entry.value = v} />
                </div>
                <button onclick={() => removeDictEntry(i)} class="p-1 transition-colors" style="color: var(--text-muted)" aria-label="Eintrag löschen">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        {/each}
    </div>
    <button onclick={addDictEntry} class="w-full mt-3 py-2 border-2 border-dashed rounded-xl text-xs font-bold transition-all" style="border-color: var(--border-main); color: var(--text-muted)">
        + Eintrag
    </button>
    <div class="flex gap-2 mt-4">
        <button onclick={() => { syncDict(); dictOpen = false; }} class="flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-colors" style="background: var(--text-indigo); color: white">
            Speichern
        </button>
    </div>
</Modal>
