
import { formatDate, getMonday, getDurationMin, formatDur, roundTo15 } from '$lib/utils/dateUtils';
import { browser } from '$app/environment';

export interface CSVEvent {
    id: string;
    Subject: string;
    "Start Date": string;
    "Start Time": string;
    "End Date": string;
    "End Time": string;
    "Show time as": string;
}

export interface ManualMeeting {
    id: string;
    start: string;
    end: string;
    subject: string;
    booking?: string;
}

export interface WorkInterval {
    start: string;
    end: string;
    booking: string;
}

export interface DurationItem {
    durationMin: number;
    booking: string;
}

const STORAGE_KEY = 'time_note_data';

export function getDictBooking(bookingDict: Record<string, string>, dictRegexFlags: Record<string, boolean>, subject: string): string {
    const direct = bookingDict[subject];
    if (direct && !dictRegexFlags[subject]) return direct;
    for (const key of Object.keys(bookingDict)) {
        if (dictRegexFlags[key] && bookingDict[key]) {
            try { if (new RegExp(key, 'i').test(subject)) return bookingDict[key]; } catch {}
        }
    }
    return '';
}

// Old fragmented keys kept only for one-time migration
const OLD_KEYS = {
    events:       'wf_events',
    bookings:     'wf_bookings',
    work:         'wf_work',
    manual:       'wf_manual',
    hideOOO:      'wf_hideOOO',
    hideWeekends: 'wf_hideWeekends',
    checkIn:      'wf_checkIn',
    bookingDict:  'wf_bookingDict',
};

class CalendarStore {
    events             = $state<CSVEvent[]>([]);
    bookings           = $state<Record<string, string>>({});
    workData           = $state<Record<string, WorkInterval[]>>({});
    manualMeetings     = $state<Record<string, ManualMeeting[]>>({});
    workDurationItems  = $state<Record<string, DurationItem[]>>({});
    currentWeekStart   = $state<Date>(getMonday(new Date()));
    hideOOO            = $state<boolean>(false);
    hideWeekends       = $state<boolean>(true);
    checkIn            = $state<string | null>(null);
    bookingDict        = $state<Record<string, string>>({});
    dictRegexFlags     = $state<Record<string, boolean>>({});
    copiedBookingEntry = $state<Record<string, string> | null>(null);

    constructor() {
        if (browser) this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                this.events         = d.events         ?? [];
                this.bookings       = d.bookings        ?? {};
                this.workData       = d.workData        ?? {};
                this.manualMeetings = d.manualMeetings  ?? {};
                this.hideOOO        = d.hideOOO         ?? false;
                this.hideWeekends   = d.hideWeekends    ?? true;
                this.checkIn        = d.checkIn         ?? null;
                this.bookingDict       = d.bookingDict       ?? {};
                this.dictRegexFlags    = d.dictRegexFlags    ?? {};
                this.workDurationItems = d.workDurationItems ?? {};
                return;
            }
        } catch {}
        // Migrate from old fragmented keys (one-time)
        try {
            this.events         = JSON.parse(localStorage.getItem(OLD_KEYS.events)       || '[]');
            this.bookings       = JSON.parse(localStorage.getItem(OLD_KEYS.bookings)      || '{}');
            this.workData       = JSON.parse(localStorage.getItem(OLD_KEYS.work)          || '{}');
            this.manualMeetings = JSON.parse(localStorage.getItem(OLD_KEYS.manual)        || '{}');
            this.hideOOO        = localStorage.getItem(OLD_KEYS.hideOOO) === 'true';
            this.hideWeekends   = localStorage.getItem(OLD_KEYS.hideWeekends) !== 'false';
            this.checkIn        = localStorage.getItem(OLD_KEYS.checkIn) ?? null;
            this.bookingDict    = JSON.parse(localStorage.getItem(OLD_KEYS.bookingDict)   || '{}');
            this.save();
        } catch {}
    }

    save() {
        if (!browser) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            version:        1,
            events:         this.events,
            bookings:       this.bookings,
            workData:       this.workData,
            manualMeetings: this.manualMeetings,
            hideOOO:        this.hideOOO,
            hideWeekends:   this.hideWeekends,
            checkIn:        this.checkIn,
            bookingDict:       this.bookingDict,
            dictRegexFlags:    this.dictRegexFlags,
            workDurationItems: this.workDurationItems,
        }));
    }

    exportJSON(): string {
        return JSON.stringify({
            version:        1,
            events:         this.events,
            bookings:       this.bookings,
            workData:       this.workData,
            manualMeetings: this.manualMeetings,
            hideOOO:        this.hideOOO,
            hideWeekends:   this.hideWeekends,
            bookingDict:       this.bookingDict,
            dictRegexFlags:    this.dictRegexFlags,
            workDurationItems: this.workDurationItems,
        }, null, 2);
    }

    importJSON(json: string): boolean {
        try {
            const d = JSON.parse(json);
            if (!d || typeof d !== 'object') return false;
            if (d.events         !== undefined) this.events         = d.events;
            if (d.bookings       !== undefined) this.bookings       = d.bookings;
            if (d.workData       !== undefined) this.workData       = d.workData;
            if (d.manualMeetings !== undefined) this.manualMeetings = d.manualMeetings;
            if (d.hideOOO        !== undefined) this.hideOOO        = d.hideOOO;
            if (d.hideWeekends   !== undefined) this.hideWeekends   = d.hideWeekends;
            if (d.bookingDict    !== undefined) this.bookingDict    = d.bookingDict;
            if (d.dictRegexFlags    !== undefined) this.dictRegexFlags    = d.dictRegexFlags;
            if (d.workDurationItems !== undefined) this.workDurationItems = d.workDurationItems;
            this.save();
            this.dispatchAllEventDates();
            return true;
        } catch { return false; }
    }

    checkInNow() {
        this.checkIn = new Date().toISOString();
        this.save();
    }

    checkOutNow() {
        if (!this.checkIn) return;
        const arrive = new Date(this.checkIn);
        const leave  = new Date();
        const dStr   = formatDate(arrive);
        const fmt    = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        if (!this.workData[dStr]) this.workData[dStr] = [];
        this.workData[dStr].push({ start: fmt(arrive), end: fmt(leave), booking: '' });
        this.checkIn = null;
        this.save();
        this.dispatchDayEvent(dStr);
    }

    clearAll() {
        this.events         = [];
        this.bookings       = {};
        this.workData       = {};
        this.manualMeetings = {};
        this.checkIn        = null;
        this.bookingDict       = {};
        this.dictRegexFlags    = {};
        this.workDurationItems = {};
        this.save();
    }

    getDictBooking(subject: string): string {
        return getDictBooking(this.bookingDict, this.dictRegexFlags, subject);
    }

    buildDayJSON(dateStr: string): { Datum: string; Einträge: { Dauer: string; Projekt: string; Vorgang: string; Tätigkeit: string; Bemerkung: string }[] } {
        const workIntervals = this.workData[dateStr] || [];
        const totalWorkMin  = workIntervals.reduce((acc, w) => acc + getDurationMin(w.start, w.end), 0);

        const dayEvents = this.events.filter(ev => {
            if (!ev["Start Date"]) return false;
            const p = ev["Start Date"].split('-');
            if (p.length < 3) return false;
            return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}` === dateStr;
        }).map(e => ({
            booking: this.getDictBooking(e.Subject) || this.bookings[e.id],
            dur:   getDurationMin(e["Start Time"], e["End Time"]),
            ooo:   e["Show time as"] === "4" || e.Subject.toLowerCase().includes("out of office") || e.Subject.toLowerCase().includes("ooo"),
            pause: e.Subject.toLowerCase().includes("pause"),
        }));

        const dayManual = (this.manualMeetings[dateStr] || []).map(m => ({
            booking: getDictBooking(this.bookingDict, this.dictRegexFlags, m.subject) || m.booking,
            dur:   getDurationMin(m.start, m.end),
            ooo:   m.subject.toLowerCase().includes("out of office") || m.subject.toLowerCase().includes("ooo"),
            pause: m.subject.toLowerCase().includes("pause"),
        }));

        const allMeetings  = [...dayEvents, ...dayManual];
        let accountedMin   = 0;
        const entries: { Dauer: string; Projekt: string; Vorgang: string; Tätigkeit: string; Bemerkung: string }[] = [];

        allMeetings.forEach(m => {
            if (m.pause) { accountedMin += m.dur; return; }
            if (m.ooo) return;
            const rounded = roundTo15(m.dur);
            if (rounded <= 0) return;
            const parts = (m.booking || '').split(';');
            entries.push({ Dauer: formatDur(rounded), Projekt: parts[0] || '', Vorgang: parts[1] || '', Tätigkeit: parts[2] || '', Bemerkung: parts[3] || '' });
            accountedMin += rounded;
        });

        const wBookings    = workIntervals.filter(w => w.booking).map(w => ({ booking: w.booking, dur: getDurationMin(w.start, w.end) }));
        const durBookings  = (this.workDurationItems[dateStr] || []).filter(d => d.booking).map(d => ({ booking: d.booking, dur: d.durationMin }));
        const nettoResidue = roundTo15(totalWorkMin - accountedMin);

        if (nettoResidue > 0) {
            const allBookings = [...wBookings, ...durBookings];
            if (allBookings.length === 0) {
                entries.push({ Dauer: formatDur(nettoResidue), Projekt: '', Vorgang: '', Tätigkeit: '', Bemerkung: '' });
            } else {
                const totalWeight = allBookings.reduce((s, wb) => s + wb.dur, 0);
                let remaining = nettoResidue;
                allBookings.forEach((wb, i) => {
                    const isLast  = i === wBookings.length - 1;
                    const thisDur = isLast ? remaining : Math.round(nettoResidue * (wb.dur / totalWeight) / 15) * 15;
                    if (!isLast) remaining -= thisDur;
                    if (thisDur > 0) {
                        const parts = wb.booking.split(';');
                        entries.push({ Dauer: formatDur(thisDur), Projekt: parts[0] || '', Vorgang: parts[1] || '', Tätigkeit: parts[2] || '', Bemerkung: parts[3] || '' });
                    }
                });
            }
        }

        return { Datum: dateStr, Einträge: entries };
    }

    dispatchDayEvent(dateStr: string) {
        if (!browser) return;
        const data = this.buildDayJSON(dateStr);
        localStorage.setItem('tn_export_' + dateStr, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent('time-note-data', { detail: data }));
    }

    dispatchAllEventDates() {
        if (!browser) return;
        const dates = new Set<string>();
        this.events.forEach(ev => {
            const p = ev["Start Date"]?.split('-');
            if (p?.length === 3) dates.add(`${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`);
        });
        Object.keys(this.manualMeetings).forEach(d => dates.add(d));
        Object.keys(this.workData).forEach(d => dates.add(d));
        dates.forEach(d => this.dispatchDayEvent(d));
    }

    changeWeek(weeks: number) {
        const newDate = new Date(this.currentWeekStart);
        newDate.setDate(newDate.getDate() + weeks * 7);
        this.currentWeekStart = newDate;
    }

    goToToday() {
        this.currentWeekStart = getMonday(new Date());
    }
}

export const calendarStore = new CalendarStore();
