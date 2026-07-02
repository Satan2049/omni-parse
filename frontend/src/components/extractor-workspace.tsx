"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Globe, Sparkles } from "lucide-react";

import { AdvancedOptions } from "@/components/advanced-options";
import { ArrangementsPanel } from "@/components/arrangements-panel";
import { ExtractionHistory } from "@/components/extraction-history";
import { ExtractionProgressPanel } from "@/components/extraction-progress";
import { PresetSelector } from "@/components/preset-selector";
import { PreviewPanel } from "@/components/preview-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  convertContent,
  extractContentStream,
  triggerDownload,
  type ExtractProgress,
  type ExtractResponse,
  type OutputFormat,
} from "@/lib/api";
import {
  getDownloadContent,
  sanitizeFilename,
  type DownloadKind,
} from "@/lib/content";
import { addHistoryEntry, type HistoryEntry } from "@/lib/history";
import { applyPreset, presetFromOptions, type ExtractPreset } from "@/lib/presets";
import { buildExtractionStats, type ExtractionStats } from "@/lib/stats";

export function ExtractorWorkspace() {
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "html">("url");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [arrangementsOpen, setArrangementsOpen] = useState(false);
  const [renderJs, setRenderJs] = useState(false);
  const [extractImages, setExtractImages] = useState(true);
  const [resolveFullsizeImages, setResolveFullsizeImages] = useState(false);
  const [resolveDeep, setResolveDeep] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("md");
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<ExtractProgress | null>(null);
  const [stats, setStats] = useState<ExtractionStats | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const extractStartedAt = useRef<number>(0);

  function clearResult() {
    setResult(null);
    setExtractError(null);
    setDownloadError(null);
    setProgress(null);
    setStats(null);
  }

  function applyPresetOptions(preset: ExtractPreset) {
    const config = applyPreset(preset);
    setRenderJs(config.renderJs);
    setExtractImages(config.extractImages);
    setResolveFullsizeImages(config.resolveFullsizeImages);
    setResolveDeep(config.resolveDeep);
  }

  function handleInputModeChange(mode: "url" | "html") {
    setInputMode(mode);
    clearResult();
  }

  const handleExtract = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setExtractError(null);
    setDownloadError(null);
    setProgress(null);
    setStats(null);
    setIsLoading(true);
    extractStartedAt.current = Date.now();

    try {
      const payload =
        inputMode === "url"
          ? {
              url: url.trim(),
              render_js: renderJs,
              extract_images: extractImages,
              resolve_fullsize_images: resolveFullsizeImages,
              resolve_deep: resolveDeep,
              output_format: outputFormat,
            }
          : {
              html: html.trim(),
              base_url: baseUrl.trim() || undefined,
              extract_images: extractImages,
              output_format: outputFormat,
            };

      const response = await extractContentStream(
        payload,
        (update) => setProgress(update),
        controller.signal,
      );

      const durationMs = Date.now() - extractStartedAt.current;
      setResult(response);
      setOutputFormat(response.output_format);
      setStats(buildExtractionStats(response, response.output_format, durationMs));

      addHistoryEntry({
        inputMode,
        url: inputMode === "url" ? url.trim() : undefined,
        preset: presetFromOptions({
          render_js: renderJs,
          extract_images: extractImages,
          resolve_fullsize_images: resolveFullsizeImages,
          resolve_deep: resolveDeep,
        }),
        outputFormat: response.output_format,
        renderJs,
        extractImages,
        resolveFullsizeImages,
        resolveDeep,
        durationMs,
        title: response.title,
        wordCount: buildExtractionStats(response, response.output_format, durationMs).wordCount,
        imageCount: response.images.length,
        fileCount: response.files.length,
        result: response,
      });
      window.dispatchEvent(new CustomEvent("omniparse-history-changed"));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setResult(null);
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
        setProgress(null);
      }
    }
  }, [
    baseUrl,
    extractImages,
    html,
    inputMode,
    outputFormat,
    renderJs,
    resolveDeep,
    resolveFullsizeImages,
    url,
  ]);

  async function handleDownload(kind: DownloadKind) {
    if (!result) return;

    setDownloadError(null);
    setIsDownloading(true);

    try {
      const content = getDownloadContent(result, kind);

      if (kind === "json") {
        triggerDownload(
          new Blob([content], { type: "application/json;charset=utf-8" }),
          `${sanitizeFilename(result.title)}.json`,
        );
        return;
      }

      const { blob, filename } = await convertContent(content, kind, result.title);
      triggerDownload(blob, filename);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  }

  function restoreFromHistory(entry: HistoryEntry) {
    setInputMode(entry.inputMode);
    setUrl(entry.url ?? "");
    setRenderJs(entry.renderJs);
    setExtractImages(entry.extractImages);
    setResolveFullsizeImages(entry.resolveFullsizeImages);
    setResolveDeep(entry.resolveDeep);
    setOutputFormat(entry.outputFormat);
    setResult(entry.result);
    setStats(
      buildExtractionStats(entry.result, entry.outputFormat, entry.durationMs),
    );
    setExtractError(null);
    setDownloadError(null);
  }

  function handleDroppedText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      setInputMode("url");
      setUrl(trimmed);
      clearResult();
      return;
    }

    if (trimmed.startsWith("<") && trimmed.includes(">")) {
      setInputMode("html");
      setHtml(trimmed);
      clearResult();
    }
  }

  async function handleDropFiles(files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (!file) return;

    if (file.type === "text/html" || file.name.endsWith(".html") || file.name.endsWith(".htm")) {
      const content = await file.text();
      setInputMode("html");
      setHtml(content);
      clearResult();
      return;
    }

    const text = await file.text();
    handleDroppedText(text);
  }

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "Escape" && isLoading) {
        abortRef.current?.abort();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !isLoading) {
        event.preventDefault();
        if (inputMode === "url" ? url.trim() : html.trim()) {
          void handleExtract();
        }
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "c" &&
        result &&
        !isTyping
      ) {
        event.preventDefault();
        void navigator.clipboard.writeText(
          result.output_format === "json"
            ? JSON.stringify(result.content_json ?? {}, null, 2)
            : result.output_format === "txt"
              ? (result.content_text ?? result.content_markdown)
              : result.content_markdown,
        );
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleExtract, html, inputMode, isLoading, result, url]);

  const canExtract = inputMode === "url" ? url.trim().length > 0 : html.trim().length > 0;

  return (
    <div className="grid flex-1 gap-6 lg:grid-cols-2">
      <section
        className={`glass-panel flex flex-col gap-5 rounded-2xl p-5 transition ${
          isDragging ? "border-primary/60 ring-2 ring-primary/30" : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (event.dataTransfer.files.length > 0) {
            void handleDropFiles(event.dataTransfer.files);
            return;
          }
          handleDroppedText(event.dataTransfer.getData("text/plain"));
        }}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4 text-primary" />
          Input &amp; Configuration
        </div>

        <div className="flex gap-2">
          <Button
            variant={inputMode === "url" ? "default" : "outline"}
            size="sm"
            onClick={() => handleInputModeChange("url")}
          >
            URL
          </Button>
          <Button
            variant={inputMode === "html" ? "default" : "outline"}
            size="sm"
            onClick={() => handleInputModeChange("html")}
          >
            Raw HTML
          </Button>
        </div>

        {inputMode === "url" ? (
          <div className="space-y-2">
            <Label htmlFor="url">Page URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (result) clearResult();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canExtract && !isLoading) {
                  void handleExtract();
                }
              }}
            />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="html">HTML Source</Label>
              <textarea
                id="html"
                className="min-h-[180px] w-full rounded-lg border border-input bg-secondary/60 px-4 py-3 text-sm shadow-inner shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="<html>...</html>"
                value={html}
                onChange={(event) => {
                  setHtml(event.target.value);
                  if (result) clearResult();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="base-url">Base URL (optional)</Label>
              <Input
                id="base-url"
                type="url"
                placeholder="https://example.com"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Resolves relative links and image paths in pasted HTML.
              </p>
            </div>
          </>
        )}

        {inputMode === "url" && (
          <PresetSelector
            renderJs={renderJs}
            extractImages={extractImages}
            resolveFullsizeImages={resolveFullsizeImages}
            resolveDeep={resolveDeep}
            onPresetChange={applyPresetOptions}
          />
        )}

        <AdvancedOptions
          open={advancedOpen}
          onOpenChange={setAdvancedOpen}
          showRenderJs={inputMode === "url"}
          renderJs={renderJs}
          onRenderJsChange={setRenderJs}
          extractImages={extractImages}
          onExtractImagesChange={setExtractImages}
          resolveFullsizeImages={resolveFullsizeImages}
          onResolveFullsizeImagesChange={setResolveFullsizeImages}
          resolveDeep={resolveDeep}
          onResolveDeepChange={setResolveDeep}
          outputFormat={outputFormat}
          onOutputFormatChange={setOutputFormat}
        />

        <ArrangementsPanel open={arrangementsOpen} onOpenChange={setArrangementsOpen} />
        <ExtractionHistory onRestore={restoreFromHistory} />

        {isLoading && <ExtractionProgressPanel progress={progress} />}

        <div className="flex gap-2">
          <Button
            size="lg"
            className="flex-1"
            disabled={!canExtract || isLoading}
            onClick={() => void handleExtract()}
          >
            <Sparkles className="h-5 w-5" />
            Extract Content
            <ArrowRight className="h-5 w-5" />
          </Button>
          {isLoading && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => abortRef.current?.abort()}
            >
              Cancel
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Shortcuts: Ctrl+Enter extract · Ctrl+Shift+C copy · Esc cancel · Drop URL/HTML file
        </p>
      </section>

      <PreviewPanel
        result={result}
        outputFormat={outputFormat}
        isLoading={isLoading}
        extractError={extractError}
        downloadError={downloadError}
        stats={stats}
        onDownload={(format) => void handleDownload(format)}
        isDownloading={isDownloading}
      />
    </div>
  );
}
