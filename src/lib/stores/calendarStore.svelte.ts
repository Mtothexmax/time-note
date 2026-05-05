
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

class CalendarStore {
    events = $state<CSVEvent[]>([]);
    bookings = $state<Record<string, string>>({});
    workData = $state<Record<string, WorkInterval[]>>({});
    manualMeetings = $state<Record<string, ManualMeeting[]>>({});
    currentWeekStart = $state<Date>(getMonday(new Date()));
    hideOOO = $state<boolean>(false);
    hideWeekends = $state<boolean>(true);
    checkIn = $state<string | null>(null);
    bookingDict = $state<Record<string, string>>({});

    constructor() {
        if (browser) {
            this.load();
        }
    }

    load() {
        this.events = JSON.parse(localStorage.getItem('wf_events') || '[]');
        this.bookings = JSON.parse(localStorage.getItem('wf_bookings') || '{}');
        this.workData = JSON.parse(localStorage.getItem('wf_work') || '{}');
        this.manualMeetings = JSON.parse(localStorage.getItem('wf_manual') || '{}');
        this.hideOOO = localStorage.getItem('wf_hideOOO') === 'true';
        this.hideWeekends = localStorage.getItem('wf_hideWeekends') !== 'false';
        const saved = localStorage.getItem('wf_checkIn');
        this.checkIn = saved ? saved : null;
        this.bookingDict = JSON.parse(localStorage.getItem('wf_bookingDict') || '{}');
    }

    save() {
        if (!browser) return;
        localStorage.setItem('wf_events', JSON.stringify(this.events));
        localStorage.setItem('wf_bookings', JSON.stringify(this.bookings));
        localStorage.setItem('wf_work', JSON.stringify(this.workData));
        localStorage.setItem('wf_manual', JSON.stringify(this.manualMeetings));
        localStorage.setItem('wf_hideOOO', this.hideOOO.toString());
        localStorage.setItem('wf_hideWeekends', this.hideWeekends.toString());
        if (this.checkIn) {
            localStorage.setItem('wf_checkIn', this.checkIn);
        } else {
            localStorage.removeItem('wf_checkIn');
        }
        localStorage.setItem('wf_bookingDict', JSON.stringify(this.bookingDict));
    }

    checkInNow() {
        this.checkIn = new Date().toISOString();
        this.save();
    }

    checkOutNow() {
        if (!this.checkIn) return;
        const arrive = new Date(this.checkIn);
        const leave = new Date();
        const dStr = formatDate(arrive);
        const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        const interval = { start: fmt(arrive), end: fmt(leave), booking: '' };
        if (!this.workData[dStr]) this.workData[dStr] = [];
        this.workData[dStr].push(interval);
        this.checkIn = null;
        this.save();
        this.dispatchDayEvent(dStr);
    }

    clearAll() {
        this.events = [];
        this.bookings = {};
        this.workData = {};
        this.manualMeetings = {};
        this.checkIn = null;
        this.save();
    }

    buildDayJSON(dateStr: string): { Datum: string; Einträge: { Dauer: string; Projekt: string; Vorgang: string; Tätigkeit: string; Bemerkung: string }[] } {
        const workIntervals = this.workData[dateStr] || [];
        const totalWorkMin = workIntervals.reduce((acc, curr) => acc + getDurationMin(curr.start, curr.end), 0);
        const dayEvents = this.events.filter(ev => {
            if (!ev["Start Date"]) return false;
            const p = ev["Start Date"].split('-');
            if (p.length < 3) return false;
            return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}` === dateStr;
        }).map(e => ({
            booking: this.bookingDict[e.Subject] || this.bookings[e.id],
            dur: getDurationMin(e["Start Time"], e["End Time"]),
            title: e.Subject,
            ooo: e["Show time as"] === "4" || e.Subject.toLowerCase().includes("out of office") || e.Subject.toLowerCase().includes("ooo"),
            pause: e.Subject.toLowerCase().includes("pause")
        }));
        const dayManual = (this.manualMeetings[dateStr] || []).map(m => ({
            booking: m.booking,
            dur: getDurationMin(m.start, m.end),
            title: m.subject,
            ooo: m.subject.toLowerCase().includes("out of office") || m.subject.toLowerCase().includes("ooo"),
            pause: m.subject.toLowerCase().includes("pause")
        }));
        const allMeetings = [...dayEvents, ...dayManual];
        let accountedMin = 0;
        const entries: { Dauer: string; Projekt: string; Vorgang: string; Tätigkeit: string; Bemerkung: string }[] = [];
        allMeetings.forEach(m => {
            if (m.pause) { accountedMin += m.dur; return; }
            if (m.ooo) return;
            const rounded = roundTo15(m.dur);
            if (rounded <= 0) return;
            const parts = (m.booking || '').split(';');
            entries.push({
                Dauer: formatDur(rounded),
                Projekt: parts[0] || '',
                Vorgang: parts[1] || '',
                Tätigkeit: parts[2] || '',
                Bemerkung: parts[3] || ''
            });
            accountedMin += rounded;
        });
        const workBooking = workIntervals.find(w => w.booking)?.booking || ';;;';
        const nettoResidue = roundTo15(totalWorkMin - accountedMin);
        if (nettoResidue > 0) {
            const parts = workBooking.split(';');
            entries.push({
                Dauer: formatDur(nettoResidue),
                Projekt: parts[0] || '',
                Vorgang: parts[1] || '',
                Tätigkeit: parts[2] || '',
                Bemerkung: parts[3] || ''
            });
        }
        return { Datum: dateStr, Einträge: entries };
    }

    dispatchDayEvent(dateStr: string) {
        if (!browser) return;
        const data = this.buildDayJSON(dateStr);
        localStorage.setItem('tn_export_' + dateStr, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent('time-note-data', { detail: data }));
    }

    changeWeek(weeks: number) {
        const newDate = new Date(this.currentWeekStart);
        newDate.setDate(newDate.getDate() + (weeks * 7));
        this.currentWeekStart = newDate;
    }

    goToToday() {
        this.currentWeekStart = getMonday(new Date());
    }
}

export const calendarStore = new CalendarStore();
