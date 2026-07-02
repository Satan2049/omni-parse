import type { ExtractResponse, OutputFormat } from "@/lib/api";
import { getPreviewContent } from "@/lib/content";

export interface ExtractionStats {
  durationMs: number;
  wordCount: number;
  charCount: number;
  imageCount: number;
  fileCount: number;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function buildExtractionStats(
  result: ExtractResponse,
  outputFormat: OutputFormat,
  durationMs: number,
): ExtractionStats {
  const preview = getPreviewContent(result, outputFormat);
  return {
    durationMs,
    wordCount: countWords(preview),
    charCount: preview.length,
    imageCount: result.images.length,
    fileCount: result.files.length,
  };
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${remainder}s`;
}
