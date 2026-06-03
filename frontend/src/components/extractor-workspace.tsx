"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Globe, Sparkles } from "lucide-react";

import { AdvancedOptions } from "@/components/advanced-options";
import { PreviewPanel } from "@/components/preview-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  convertContent,
  extractContent,
  triggerDownload,
  type ExtractResponse,
  type OutputFormat,
} from "@/lib/api";
import {
  getDownloadContent,
  sanitizeFilename,
  type DownloadKind,
} from "@/lib/content";

export function ExtractorWorkspace() {
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "html">("url");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [renderJs, setRenderJs] = useState(false);
  const [extractImages, setExtractImages] = useState(true);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("md");
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function clearResult() {
    setResult(null);
    setExtractError(null);
    setDownloadError(null);
  }

  function handleInputModeChange(mode: "url" | "html") {
    setInputMode(mode);
    clearResult();
  }

  async function handleExtract() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setExtractError(null);
    setDownloadError(null);
    setIsLoading(true);

    try {
      const payload =
        inputMode === "url"
          ? {
              url: url.trim(),
              render_js: renderJs,
              extract_images: extractImages,
              output_format: outputFormat,
            }
          : {
              html: html.trim(),
              base_url: baseUrl.trim() || undefined,
              extract_images: extractImages,
              output_format: outputFormat,
            };

      const response = await extractContent(payload, controller.signal);
      setResult(response);
      setOutputFormat(response.output_format);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setResult(null);
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }

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

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const canExtract = inputMode === "url" ? url.trim().length > 0 : html.trim().length > 0;

  return (
    <div className="grid flex-1 gap-6 lg:grid-cols-2">
      <section className="glass-panel flex flex-col gap-5 rounded-2xl p-5">
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

        <AdvancedOptions
          open={advancedOpen}
          onOpenChange={setAdvancedOpen}
          showRenderJs={inputMode === "url"}
          renderJs={renderJs}
          onRenderJsChange={setRenderJs}
          extractImages={extractImages}
          onExtractImagesChange={setExtractImages}
          outputFormat={outputFormat}
          onOutputFormatChange={(format) => {
            setOutputFormat(format);
            if (result) clearResult();
          }}
        />

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
      </section>

      <PreviewPanel
        result={result}
        outputFormat={outputFormat}
        isLoading={isLoading}
        extractError={extractError}
        downloadError={downloadError}
        onDownload={(format) => void handleDownload(format)}
        isDownloading={isDownloading}
      />
    </div>
  );
}
