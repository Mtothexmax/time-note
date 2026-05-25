const STORAGE_KEY = 'tn_field_history';
const MAX_ENTRIES = 50;

type History = Record<string, string[]>;

function load(): History {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
        return {};
    }
}

class FieldHistoryStore {
    #data = $state<History>(load());

    get(field: string): string[] {
        return this.#data[field] ?? [];
    }

    add(field: string, value: string) {
        const v = value.trim();
        if (!v) return;
        const existing = this.#data[field] ?? [];
        if (existing[0] === v) return;
        this.#data = {
            ...this.#data,
            [field]: [v, ...existing.filter((x) => x !== v)].slice(0, MAX_ENTRIES),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#data));
    }
}

export const fieldHistory = new FieldHistoryStore();
