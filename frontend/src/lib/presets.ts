import type { ExtractRequest } from "@/lib/api";

export type ExtractPreset = "fast" | "standard" | "deep";

export interface PresetConfig {
  label: string;
  description: string;
  renderJs: boolean;
  extractImages: boolean;
  resolveFullsizeImages: boolean;
  resolveDeep: boolean;
}

export const EXTRACT_PRESETS: Record<ExtractPreset, PresetConfig> = {
  fast: {
    label: "Fast",
    description: "Static HTTP fetch — quickest, no JavaScript rendering",
    renderJs: false,
    extractImages: false,
    resolveFullsizeImages: false,
    resolveDeep: false,
  },
  standard: {
    label: "Standard",
    description: "JavaScript rendering with image URL collection",
    renderJs: true,
    extractImages: true,
    resolveFullsizeImages: false,
    resolveDeep: false,
  },
  deep: {
    label: "Deep Gallery",
    description: "Full-size images with lightbox clicks and gallery crawl",
    renderJs: false,
    extractImages: true,
    resolveFullsizeImages: true,
    resolveDeep: true,
  },
};

export function presetFromOptions(options: Pick<
  ExtractRequest,
  "render_js" | "extract_images" | "resolve_fullsize_images" | "resolve_deep"
>): ExtractPreset | "custom" {
  for (const [key, preset] of Object.entries(EXTRACT_PRESETS) as [ExtractPreset, PresetConfig][]) {
    if (
      Boolean(options.render_js) === preset.renderJs &&
      Boolean(options.extract_images) === preset.extractImages &&
      Boolean(options.resolve_fullsize_images) === preset.resolveFullsizeImages &&
      Boolean(options.resolve_deep) === preset.resolveDeep
    ) {
      return key;
    }
  }
  return "custom";
}

export function applyPreset(preset: ExtractPreset): PresetConfig {
  return EXTRACT_PRESETS[preset];
}
