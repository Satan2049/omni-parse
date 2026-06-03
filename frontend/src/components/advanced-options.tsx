"use client";

import { ChevronDown, Settings2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { OutputFormat } from "@/lib/api";
import { cn } from "@/lib/utils";

const OUTPUT_FORMATS: OutputFormat[] = ["md", "json", "txt"];

interface AdvancedOptionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showRenderJs: boolean;
  renderJs: boolean;
  onRenderJsChange: (value: boolean) => void;
  extractImages: boolean;
  onExtractImagesChange: (value: boolean) => void;
  outputFormat: OutputFormat;
  onOutputFormatChange: (value: OutputFormat) => void;
}

export function AdvancedOptions({
  open,
  onOpenChange,
  showRenderJs,
  renderJs,
  onRenderJsChange,
  extractImages,
  onExtractImagesChange,
  outputFormat,
  onOutputFormatChange,
}: AdvancedOptionsProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-secondary/40 px-4 py-3 text-sm font-medium transition hover:border-primary/40 hover:bg-secondary/60">
        <span className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          Advanced Options
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-4 rounded-lg border border-white/10 bg-secondary/20 p-4">
        {showRenderJs ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="render-js">Render JavaScript</Label>
              <p className="text-xs text-muted-foreground">
                Use Playwright for SPAs and dynamic pages (slower).
              </p>
            </div>
            <Switch id="render-js" checked={renderJs} onCheckedChange={onRenderJsChange} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Render JavaScript is only available when extracting from a URL.
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="extract-images">Extract Images</Label>
            <p className="text-xs text-muted-foreground">
              Collect image URLs from article content for multimodal pipelines.
            </p>
          </div>
          <Switch
            id="extract-images"
            checked={extractImages}
            onCheckedChange={onExtractImagesChange}
          />
        </div>

        <div className="space-y-2">
          <Label>Output Format</Label>
          <Select
            value={outputFormat}
            onValueChange={(value) => {
              if (OUTPUT_FORMATS.includes(value as OutputFormat)) {
                onOutputFormatChange(value as OutputFormat);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="md">Markdown</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="txt">Plain Text</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
