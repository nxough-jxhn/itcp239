import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "peakplay.notifications.v1";
const MAX_ITEMS = 200;

function toIsoDate(value) {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeEntry(input) {
    if (!input) return null;
    const id = String(input.id || input.identifier || "").trim();
    if (!id) return null;

    return {
        id,
        title: String(input.title || "Notification"),
        body: String(input.body || ""),
        date: toIsoDate(input.date),
        data: input.data && typeof input.data === "object" ? input.data : {},
        read: Boolean(input.read),
        openedAt: input.openedAt ? toIsoDate(input.openedAt) : null,
    };
}

async function readAll() {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeEntry).filter(Boolean);
    } catch {
        return [];
    }
}

async function writeAll(items) {
    const safe = (Array.isArray(items) ? items : [])
        .map(normalizeEntry)
        .filter(Boolean)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, MAX_ITEMS);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    return safe;
}

export async function getStoredNotifications() {
    return readAll();
}

export async function upsertNotification(input) {
    const entry = normalizeEntry(input);
    if (!entry) return [];

    const current = await readAll();
    const existingIndex = current.findIndex((item) => item.id === entry.id);

    if (existingIndex >= 0) {
        const existing = current[existingIndex];
        current[existingIndex] = {
            ...existing,
            ...entry,
            read: existing.read || entry.read,
            openedAt: existing.openedAt || entry.openedAt || null,
        };
    } else {
        current.unshift(entry);
    }

    return writeAll(current);
}

export async function markNotificationRead(id, openedAt = new Date()) {
    const key = String(id || "").trim();
    if (!key) return [];

    const current = await readAll();
    const updated = current.map((item) =>
        item.id === key
            ? {
                ...item,
                read: true,
                openedAt: toIsoDate(openedAt),
            }
            : item
    );

    return writeAll(updated);
}

export async function clearStoredNotifications() {
    await AsyncStorage.removeItem(STORAGE_KEY);
}
