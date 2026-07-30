export interface HighlightSegment {
    text: string;
    match: boolean;
}

// Splits text into segments so a query substring can be wrapped/highlighted without using {@html}.
export function highlightParts(text: string, query: string): HighlightSegment[] {
    if (!query) return [{ text, match: false }];
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    const parts: HighlightSegment[] = [];
    let i = 0;
    while (i < text.length) {
        const idx = lower.indexOf(q, i);
        if (idx === -1) {
            parts.push({ text: text.slice(i), match: false });
            break;
        }
        if (idx > i) parts.push({ text: text.slice(i, idx), match: false });
        parts.push({ text: text.slice(idx, idx + q.length), match: true });
        i = idx + q.length;
    }
    return parts;
}
