
import { formatDate, getMonday } from '$lib/utils/dateUtils';
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
    }

    clearAll() {
        this.events = [];
        this.bookings = {};
        this.workData = {};
        this.manualMeetings = {};
        this.checkIn = null;
        this.save();
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
