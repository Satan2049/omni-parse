import type { ExtractResponse, OutputFormat } from "@/lib/api";
import type { ExtractPreset } from "@/lib/presets";

const STORAGE_KEY = "omniparse-extraction-history";
const MAX_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  timestamp: number;
  inputMode: "url" | "html";
  url?: string;
  preset: ExtractPreset | "custom";
  outputFormat: OutputFormat;
  renderJs: boolean;
  extractImages: boolean;
  resolveFullsizeImages: boolean;
  resolveDeep: boolean;
  durationMs: number;
  title: string;
  wordCount: number;
  imageCount: number;
  fileCount: number;
  result: ExtractResponse;
}

function readAll(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: HistoryEntry[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function loadHistory(): HistoryEntry[] {
  return readAll();
}

export function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "timestamp">): HistoryEntry {
  const full: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  const entries = [full, ...readAll()].slice(0, MAX_ENTRIES);
  writeAll(entries);
  return full;
}

export function removeHistoryEntry(id: string) {
  writeAll(readAll().filter((entry) => entry.id !== id));
}

export function clearHistory() {
  window.localStorage.removeItem(STORAGE_KEY);
}
