"use client";

import { Zap } from "lucide-react";

import {
  EXTRACT_PRESETS,
  type ExtractPreset,
  presetFromOptions,
} from "@/lib/presets";
import { cn } from "@/lib/utils";

interface PresetSelectorProps {
  renderJs: boolean;
  extractImages: boolean;
  resolveFullsizeImages: boolean;
  resolveDeep: boolean;
  onPresetChange: (preset: ExtractPreset) => void;
}

export function PresetSelector({
  renderJs,
  extractImages,
  resolveFullsizeImages,
  resolveDeep,
  onPresetChange,
}: PresetSelectorProps) {
  const active = presetFromOptions({
    render_js: renderJs,
    extract_images: extractImages,
    resolve_fullsize_images: resolveFullsizeImages,
    resolve_deep: resolveDeep,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Zap className="h-4 w-4 text-primary" />
        Extraction preset
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(EXTRACT_PRESETS) as ExtractPreset[]).map((preset) => {
          const config = EXTRACT_PRESETS[preset];
          const isActive = active === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onPresetChange(preset)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition",
                isActive
                  ? "border-primary/60 bg-primary/10 shadow-lg shadow-primary/10"
                  : "border-white/10 bg-secondary/30 hover:border-primary/30 hover:bg-secondary/50",
              )}
            >
              <p className="text-sm font-medium">{config.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{config.description}</p>
            </button>
          );
        })}
      </div>
      {active === "custom" && (
        <p className="text-xs text-muted-foreground">
          Custom options — adjust toggles in Advanced Options below.
        </p>
      )}
    </div>
  );
}
