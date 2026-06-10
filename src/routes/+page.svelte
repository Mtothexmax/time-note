
<script lang="ts">
    import Header from '$lib/components/Header.svelte';
    import CalendarGrid from '$lib/components/CalendarGrid.svelte';
    import Modal from '$lib/components/Modal.svelte';
    import MeetingModalContent from '$lib/components/MeetingModalContent.svelte';
    import WorkModalContent from '$lib/components/WorkModalContent.svelte';
    import DictModalContent from '$lib/components/DictModalContent.svelte';
    import { onMount } from 'svelte';
    import { calendarStore, getDictBooking, type ManualMeeting, type CSVEvent, type WorkInterval } from '$lib/stores/calendarStore.svelte';
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
        intervals: [] as any[],
        durationItems: [] as { durationMin: number; booking: string }[]
    });

    function openMeetingModal(ev: any) {
        const p = ev["Start Date"].split('-');
        const evDateStr = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        meetingModal = {
            isOpen: true,
            title: '',
            isManual: false,
            dateStr: evDateStr,
            data: {
                id: ev.id,
                start: ev["Start Time"],
                end: ev["End Time"],
                subject: ev.Subject,
                booking: getDictBooking(calendarStore.bookingDict, calendarStore.dictRegexFlags, ev.Subject) || calendarStore.bookings[ev.id] || '',
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
            title: '',
            isManual: true,
            dateStr,
            data: { ...data, timeInfo: '' }
        };
    }

    function openWorkModal(dateStr: string) {
        const src = calendarStore.workData[dateStr];
        const durSrc = calendarStore.workDurationItems[dateStr];
        workModal = {
            isOpen: true,
            dateStr,
            intervals: src
                ? src.map(w => ({ start: w.start, end: w.end, booking: w.booking }))
                : [{ start: '08:00', end: '16:30', booking: '' }],
            durationItems: durSrc ? durSrc.map(d => ({ ...d })) : []
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

    function saveWork(intervals: any[], durationItems: { durationMin: number; booking: string }[]) {
        calendarStore.workData[workModal.dateStr] = intervals.map(i => ({ start: i.start, end: i.end, booking: i.booking }));
        calendarStore.workDurationItems[workModal.dateStr] = durationItems.map(d => ({ durationMin: d.durationMin, booking: d.booking }));
        if (calendarStore.checkIn && workModal.dateStr === formatDate(new Date())) {
            const saved = calendarStore.workData[workModal.dateStr];
            const last = saved[saved.length - 1];
            if (last && last.end === '') {
                const [h, m] = last.start.split(':').map(Number);
                const t = new Date();
                t.setHours(h, m, 0, 0);
                calendarStore.checkIn = t.toISOString();
            }
        }
        calendarStore.save();
        if (workModal.dateStr) calendarStore.dispatchDayEvent(workModal.dateStr);
        workModal.isOpen = false;
    }

    let overlapMenuEvents = $state<{ title: string; time: string; date: string; style: string; onClick: () => void }[]>([]);
    let overlapMenuPos = $state({ x: 0, y: 0 });
    let overlapMenuOpen = $state(false);

    function openOverlapMenu(events: any[], x: number, y: number) {
        overlapMenuEvents = events;
        const menuW = 200;
        const maxX = window.innerWidth - menuW - 8;
        overlapMenuPos = { x: Math.min(x, maxX), y };
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
    let dictEntries = $state<{ key: string; value: string; isRegex?: boolean }[]>([]);

    function syncDict(entries: { key: string; value: string; isRegex?: boolean }[]) {
        const obj: Record<string, string> = {};
        const regexFlags: Record<string, boolean> = {};
        for (const e of entries) {
            if (e.key.trim()) {
                obj[e.key.trim()] = e.value.trim();
                if (e.isRegex) regexFlags[e.key.trim()] = true;
            }
        }
        calendarStore.bookingDict = obj;
        calendarStore.dictRegexFlags = regexFlags;
        // Apply dict to all existing events — overwrites manual bookings
        calendarStore.events.forEach(ev => {
            const d = getDictBooking(obj, regexFlags, ev.Subject);
            if (d) calendarStore.bookings[ev.id] = d;
        });
        // Apply dict to all manual meetings
        Object.keys(calendarStore.manualMeetings).forEach(dStr => {
            calendarStore.manualMeetings[dStr] = (calendarStore.manualMeetings[dStr] || []).map(m => {
                const d = getDictBooking(obj, regexFlags, m.subject);
                if (d) m.booking = d;
                return m;
            });
        });
        calendarStore.save();
        calendarStore.dispatchAllEventDates();
        dictOpen = false;
    }

    function openDict() {
        const dict = calendarStore.bookingDict;
        const flags = calendarStore.dictRegexFlags;
        dictEntries = Object.keys(dict).length > 0
            ? Object.keys(dict).map(k => ({ key: k, value: dict[k], isRegex: flags[k] ?? false }))
            : [{ key: '', value: '', isRegex: false }];
        dictOpen = true;
    }
</script>

<div class="w-full p-4 h-screen flex flex-col overflow-hidden">
    <Header onOpenBookingDict={openDict} onOpenWork={(d) => {
        const src = calendarStore.workData[d];
        const durSrc = calendarStore.workDurationItems[d];
        const isCheckedInToday = d === formatDate(new Date()) && !!calendarStore.checkIn;
        let intervals: { start: string; end: string; booking: string }[];
        if (src && src.length > 0) {
            intervals = src.map(w => ({ start: w.start, end: w.end, booking: w.booking }));
            if (isCheckedInToday && intervals[intervals.length - 1].end !== '') {
                const arrive = new Date(calendarStore.checkIn!);
                intervals.push({ start: `${String(arrive.getHours()).padStart(2,'0')}:${String(arrive.getMinutes()).padStart(2,'0')}`, end: '', booking: '' });
            }
        } else if (isCheckedInToday) {
            const arrive = new Date(calendarStore.checkIn!);
            intervals = [{ start: `${String(arrive.getHours()).padStart(2,'0')}:${String(arrive.getMinutes()).padStart(2,'0')}`, end: '', booking: '' }];
        } else {
            intervals = [];
        }
        workModal = {
            isOpen: true,
            dateStr: d,
            intervals,
            durationItems: durSrc ? durSrc.map(x => ({ ...x })) : []
        };
    }} />

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
    titleValue={meetingModal.data.subject}
    onTitleChange={(v) => meetingModal.data.subject = v}
    onClose={() => meetingModal.isOpen = false}
>
    <MeetingModalContent 
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
    widthClass="max-w-4xl"
    onClose={() => workModal.isOpen = false}
>
    <WorkModalContent
        intervals={workModal.intervals}
        dateStr={workModal.dateStr}
        onSave={saveWork}
        checkedIn={workModal.dateStr === formatDate(new Date()) && !!calendarStore.checkIn}
    />
</Modal>

<Modal 
    isOpen={dictOpen} 
    title="Buchungsnummern" 
    widthClass="max-w-max"
    onClose={() => dictOpen = false}
>
    <DictModalContent entries={dictEntries} onSave={syncDict} />
</Modal>
