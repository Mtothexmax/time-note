import { Temporal } from '@js-temporal/polyfill';

// Parse "HH:MM" or "HH:MM:SS" into a Temporal.PlainTime.
function pt(t: string): Temporal.PlainTime {
    const [h, m] = t.split(':').map(Number);
    return new Temporal.PlainTime(h || 0, m || 0);
}

export function getDurationMin(s: string, e: string): number {
    if (!s || !e) return 0;
    return pt(s).until(pt(e)).total({ unit: 'minute' });
}

export function toMinutes(time: string): number {
    if (!time) return 0;
    const t = pt(time);
    return t.hour * 60 + t.minute;
}

export function formatDur(min: number): string {
    return `${Math.floor(min / 60)}:${(min % 60).toString().padStart(2, '0')}`;
}

export function roundTo15(min: number): number {
    return Math.round(min / 15) * 15;
}

export function stripSeconds(time: string): string {
    if (!time) return time;
    return time.split(':').slice(0, 2).join(':');
}

export function addDays(dateStr: string, days: number): string {
    return Temporal.PlainDate.from(dateStr).add({ days }).toString();
}

export function addMonths(dateStr: string, months: number): string {
    return Temporal.PlainDate.from(dateStr).add({ months }).toString();
}

export function isoWeekday(dateStr: string): number {
    return Temporal.PlainDate.from(dateStr).dayOfWeek; // 1 = Monday ... 7 = Sunday
}

export type RepeatType = 'weekdays' | 'daily' | 'weekly' | 'biweekly';

// Dates after startDateStr (exclusive) up to untilDateStr (inclusive) matching the repeat pattern.
export function getRepeatDates(startDateStr: string, type: RepeatType, untilDateStr: string): string[] {
    const dates: string[] = [];
    if (!untilDateStr || untilDateStr < startDateStr) return dates;
    const step = type === 'biweekly' ? 14 : type === 'weekly' ? 7 : 1;
    let cur = startDateStr;
    for (let i = 0; i < 730; i++) {
        cur = addDays(cur, step);
        if (cur > untilDateStr) break;
        if (type === 'weekdays' && (isoWeekday(cur) === 6 || isoWeekday(cur) === 7)) continue;
        dates.push(cur);
    }
    return dates;
}

export function getGridRow(time: string): number {
    if (!time) return 0;
    const t = pt(time);
    return t.hour * 2 + (t.minute >= 30 ? 3 : 2);
}

export function getGridOffset(time: string): number {
    if (!time) return 0;
    return pt(time).minute % 30;
}

export function getRowSpanCeil(start: string, end: string): number {
    return Math.max(1, Math.ceil(Math.max(15, getDurationMin(start, end)) / 30));
}

export function getPreciseHeight(start: string, end: string): number {
    const dur = getDurationMin(start, end);
    return Math.max(15, Math.ceil(Math.max(15, dur) / 15) * 15);
}

export function getMonday(d: Date): Date {
    const plain = Temporal.PlainDate.from(
        Temporal.Instant.fromEpochMilliseconds(d.getTime())
            .toZonedDateTimeISO(Temporal.Now.timeZoneId())
            .toPlainDate()
            .toString()
    );
    const monday = plain.subtract({ days: plain.dayOfWeek - 1 });
    return new Date(monday.toString() + 'T00:00:00');
}

export function formatDate(date: Date): string {
    return Temporal.Instant.fromEpochMilliseconds(date.getTime())
        .toZonedDateTimeISO(Temporal.Now.timeZoneId())
        .toPlainDate()
        .toString();
}

export function diffDays(a: Date, b: Date): number {
    const pa = Temporal.PlainDate.from(formatDate(a));
    const pb = Temporal.PlainDate.from(formatDate(b));
    return pb.until(pa).total({ unit: 'day' });
}

export interface TimeSlot {
    id: string;
    startMin: number;
    endMin: number;
}

export function computeOverlaps(slots: TimeSlot[]): Map<string, { zIndex: number; overlapIds: string[] }> {
    const sorted = [...slots].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const groups: string[][] = [];
    const used = new Set<string>();

    for (let i = 0; i < sorted.length; i++) {
        if (used.has(sorted[i].id)) continue;
        const group = [sorted[i].id];
        used.add(sorted[i].id);
        let groupEnd = sorted[i].endMin;
        for (let j = i + 1; j < sorted.length; j++) {
            if (sorted[j].startMin < groupEnd) {
                group.push(sorted[j].id);
                used.add(sorted[j].id);
                groupEnd = Math.max(groupEnd, sorted[j].endMin);
            } else break;
        }
        if (group.length > 1) groups.push(group);
    }

    const result = new Map<string, { zIndex: number; overlapIds: string[] }>();
    for (const group of groups) {
        const groupSlots = group.map(id => slots.find(s => s.id === id)!);
        const byDur = [...groupSlots].sort((a, b) => (b.endMin - b.startMin) - (a.endMin - a.startMin));
        byDur.forEach((slot, idx) => {
            result.set(slot.id, { zIndex: 10 + idx, overlapIds: group });
        });
    }
    return result;
}

export function csvDateToISO(date?: string): string | null {
    if (!date || typeof date !== 'string') return null;
    const parts = date.split('-');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    if (!d || !m || !y) return null;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
