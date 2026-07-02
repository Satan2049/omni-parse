"use client";

import { Clock3, FileText, ImageIcon, Paperclip } from "lucide-react";

import type { ExtractionStats } from "@/lib/stats";
import { formatDuration } from "@/lib/stats";

interface ExtractionStatsPanelProps {
  stats: ExtractionStats;
}

export function ExtractionStatsPanel({ stats }: ExtractionStatsPanelProps) {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-secondary/40 px-2.5 py-1">
        <Clock3 className="h-3.5 w-3.5" />
        {formatDuration(stats.durationMs)}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-secondary/40 px-2.5 py-1">
        <FileText className="h-3.5 w-3.5" />
        {stats.wordCount.toLocaleString()} words
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-secondary/40 px-2.5 py-1">
        <ImageIcon className="h-3.5 w-3.5" />
        {stats.imageCount} images
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-secondary/40 px-2.5 py-1">
        <Paperclip className="h-3.5 w-3.5" />
        {stats.fileCount} files
      </span>
    </div>
  );
}
