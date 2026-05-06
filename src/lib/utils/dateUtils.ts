
export function getMonday(d: Date): Date {
    const date = new Date(d);
    date.setHours(12, 0, 0, 0);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(date.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
}

export function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function getDurationMin(s: string, e: string): number {
    if (!s || !e) return 0;
    const [h1, m1] = s.split(':').map(Number);
    const [h2, m2] = e.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
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

export function toMinutes(time: string): number {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
}

export function getGridRow(time: string): number {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return (h * 2) + (m >= 30 ? 3 : 2);
}

// Pixel offset within the 30-min grid row (0 or 15 for quarter-hour starts)
export function getGridOffset(time: string): number {
    if (!time) return 0;
    const [, m] = time.split(':').map(Number);
    return m % 30;
}

export function getRowSpanCeil(start: string, end: string): number {
    const duration = getDurationMin(start, end);
    return Math.max(1, Math.ceil(Math.max(15, duration) / 30));
}

export function getPreciseHeight(start: string, end: string): number {
    const duration = getDurationMin(start, end);
    return Math.max(15, Math.ceil(Math.max(15, duration) / 15) * 15);
}

export function diffDays(a: Date, b: Date): number {
    const aDate = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const bDate = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((aDate - bDate) / 86400000);
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