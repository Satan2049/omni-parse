"use client";

import { useState } from "react";
import { Check, Copy, Download, FileJson, FileText, ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExtractResponse, OutputFormat } from "@/lib/api";
import { getPreviewContent, type DownloadKind } from "@/lib/content";

interface PreviewPanelProps {
  result: ExtractResponse | null;
  outputFormat: OutputFormat;
  isLoading: boolean;
  extractError: string | null;
  downloadError: string | null;
  onDownload: (format: DownloadKind) => void;
  isDownloading: boolean;
}

export function PreviewPanel({
  result,
  outputFormat,
  isLoading,
  extractError,
  downloadError,
  onDownload,
  isDownloading,
}: PreviewPanelProps) {
  const [copied, setCopied] = useState(false);
  const previewText = result ? getPreviewContent(result, outputFormat) : "";

  async function handleCopy() {
    if (!previewText) return;
    await navigator.clipboard.writeText(previewText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="glass-panel flex h-full min-h-[640px] flex-col rounded-2xl p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">Live Preview</p>
          <h2 className="text-2xl font-semibold">{result?.title ?? "Waiting for extraction"}</h2>
        </div>
        {result && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void handleCopy()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isDownloading}
              onClick={() => onDownload("md")}
            >
              <Download className="h-4 w-4" />
              MD
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isDownloading}
              onClick={() => onDownload("txt")}
            >
              <Download className="h-4 w-4" />
              TXT
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isDownloading}
              onClick={() => onDownload("json")}
            >
              <Download className="h-4 w-4" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isDownloading}
              onClick={() => onDownload("pdf")}
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        )}
      </div>

      {isDownloading && (
        <p className="mb-3 text-sm text-muted-foreground">Preparing download…</p>
      )}

      {downloadError && (
        <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          Download failed: {downloadError}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p>Extracting and cleaning page content…</p>
        </div>
      )}

      {!isLoading && extractError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          {extractError}
        </div>
      )}

      {!isLoading && !extractError && !result && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
          <FileText className="h-10 w-10 text-primary/70" />
          <p>Paste a URL and hit Extract to see Markdown, JSON, or Text here.</p>
        </div>
      )}

      {!isLoading && !extractError && result && (
        <Tabs defaultValue="content" className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="content">
              <FileText className="mr-2 h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="metadata">
              <FileJson className="mr-2 h-4 w-4" />
              Metadata
            </TabsTrigger>
            <TabsTrigger value="images">
              <ImageIcon className="mr-2 h-4 w-4" />
              Images ({result.images.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="min-h-0 flex-1">
            <pre className="h-[480px] overflow-auto rounded-lg border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-foreground/90">
              {previewText || "No content extracted."}
            </pre>
          </TabsContent>

          <TabsContent value="metadata" className="min-h-0 flex-1">
            <pre className="h-[480px] overflow-auto rounded-lg border border-white/10 bg-black/30 p-4 text-sm leading-relaxed">
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(result.metadata).filter(([, value]) => {
                    if (Array.isArray(value)) return value.length > 0;
                    return value !== null && value !== undefined && value !== "";
                  }),
                ),
                null,
                2,
              ) || "{}"}
            </pre>
          </TabsContent>

          <TabsContent value="images" className="min-h-0 flex-1">
            <div className="h-[480px] space-y-3 overflow-auto rounded-lg border border-white/10 bg-black/30 p-4">
              {result.images.length === 0 ? (
                <p className="text-sm text-muted-foreground">No images found in the extracted content.</p>
              ) : (
                result.images.map((image) => (
                  <div key={image} className="flex items-center gap-3 rounded-md border border-white/5 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt=""
                      className="h-12 w-12 rounded object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                    <a
                      href={image}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm text-primary hover:underline"
                    >
                      {image}
                    </a>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}
