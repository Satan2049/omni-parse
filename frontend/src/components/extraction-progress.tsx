"use client";

import type { ExtractProgress } from "@/lib/api";

const STAGE_LABELS: Record<string, string> = {
  validating: "Validating",
  fetching: "Fetching",
  rendering: "Rendering",
  scrolling: "Scrolling",
  resolving_images: "Resolving images",
  deep_crawl: "Deep crawl",
  extracting: "Extracting",
  finalizing: "Finalizing",
};

interface ExtractionProgressProps {
  progress: ExtractProgress | null;
}

export function ExtractionProgressPanel({ progress }: ExtractionProgressProps) {
  if (!progress) return null;

  const label = STAGE_LABELS[progress.stage] ?? progress.stage;
  const hasSteps =
    progress.current !== undefined &&
    progress.total !== undefined &&
    progress.total > 0;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-primary">{label}</p>
        {hasSteps && (
          <span className="text-xs text-muted-foreground">
            {progress.current}/{progress.total}
          </span>
        )}
      </div>
      <p className="mt-1 text-muted-foreground">{progress.message}</p>
      {hasSteps && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{
              width: `${Math.min(100, ((progress.current ?? 0) / (progress.total ?? 1)) * 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
