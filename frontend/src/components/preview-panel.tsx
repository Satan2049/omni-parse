"use client";

import { useState } from "react";
import { Check, Copy, Download, Eye, FileJson, FileText, Files, ImageIcon } from "lucide-react";

import { ExtractionStatsPanel } from "@/components/extraction-stats-panel";
import { MarkdownPreview } from "@/components/markdown-preview";
import { VirtualizedText } from "@/components/virtualized-text";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  downloadImagesParallel,
  downloadMedia,
  type ExtractResponse,
  type OutputFormat,
} from "@/lib/api";
import { getPreviewContent, type DownloadKind } from "@/lib/content";
import type { ExtractionStats } from "@/lib/stats";

interface PreviewPanelProps {
  result: ExtractResponse | null;
  outputFormat: OutputFormat;
  isLoading: boolean;
  extractError: string | null;
  downloadError: string | null;
  stats: ExtractionStats | null;
  onDownload: (format: DownloadKind) => void;
  isDownloading: boolean;
}

export function PreviewPanel({
  result,
  outputFormat,
  isLoading,
  extractError,
  downloadError,
  stats,
  onDownload,
  isDownloading,
}: PreviewPanelProps) {
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<"raw" | "rendered">("raw");
  const [imageDownloadError, setImageDownloadError] = useState<string | null>(null);
  const [downloadingImage, setDownloadingImage] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const previewText = result ? getPreviewContent(result, outputFormat) : "";
  const markdownSource = result?.content_markdown ?? "";

  async function handleImageDownload(imageUrl: string) {
    setImageDownloadError(null);
    setDownloadingImage(imageUrl);
    try {
      const { downloadImage } = await import("@/lib/api");
      await downloadImage(imageUrl);
    } catch (err) {
      setImageDownloadError(err instanceof Error ? err.message : "Image download failed");
    } finally {
      setDownloadingImage(null);
    }
  }

  async function handleDownloadAllImages() {
    if (!result?.images.length) return;
    setImageDownloadError(null);
    setDownloadingAll(true);
    try {
      await downloadImagesParallel(result.images, 5);
    } catch (err) {
      setImageDownloadError(err instanceof Error ? err.message : "Bulk download failed");
    } finally {
      setDownloadingAll(false);
    }
  }

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
          {stats && <div className="mt-2"><ExtractionStatsPanel stats={stats} /></div>}
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
            <TabsTrigger value="files">
              <Files className="mr-2 h-4 w-4" />
              Files ({result.files.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="min-h-0 flex-1">
            {outputFormat === "md" && (
              <div className="mb-2 flex gap-2">
                <Button
                  variant={previewMode === "raw" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode("raw")}
                >
                  <FileText className="h-4 w-4" />
                  Raw
                </Button>
                <Button
                  variant={previewMode === "rendered" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode("rendered")}
                >
                  <Eye className="h-4 w-4" />
                  Rendered
                </Button>
              </div>
            )}
            <div className="h-[480px] rounded-lg border border-white/10 bg-black/30">
              {outputFormat === "md" && previewMode === "rendered" ? (
                <MarkdownPreview markdown={markdownSource} className="h-[480px]" />
              ) : (
                <VirtualizedText
                  text={previewText || "No content extracted."}
                  className="h-[480px] py-4"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="min-h-0 flex-1">
            <VirtualizedText
              text={
                JSON.stringify(
                  Object.fromEntries(
                    Object.entries(result.metadata).filter(([, value]) => {
                      if (Array.isArray(value)) return value.length > 0;
                      return value !== null && value !== undefined && value !== "";
                    }),
                  ),
                  null,
                  2,
                ) || "{}"
              }
              className="h-[480px] rounded-lg border border-white/10 bg-black/30 py-4"
            />
          </TabsContent>

          <TabsContent value="images" className="min-h-0 flex-1">
            <div className="h-[480px] space-y-3 overflow-auto rounded-lg border border-white/10 bg-black/30 p-4">
              {imageDownloadError && (
                <p className="text-sm text-destructive-foreground">{imageDownloadError}</p>
              )}
              {result.images.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={downloadingAll || downloadingImage !== null}
                    onClick={() => void handleDownloadAllImages()}
                  >
                    <Download className="h-4 w-4" />
                    {downloadingAll ? "Downloading…" : "Save all images"}
                  </Button>
                </div>
              )}
              {result.images.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No images found. Enable Extract Images and, for galleries, Resolve Full-Size Images.
                </p>
              ) : (
                result.images.map((image) => (
                  <div key={image} className="flex items-center gap-3 rounded-md border border-white/5 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt=""
                      className="h-16 w-16 rounded object-cover"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                    <a
                      href={image}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-sm text-primary hover:underline"
                    >
                      {image}
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingImage === image || downloadingAll}
                      onClick={() => void handleImageDownload(image)}
                    >
                      <Download className="h-4 w-4" />
                      {downloadingImage === image ? "Saving…" : "Save"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="files" className="min-h-0 flex-1">
            <div className="h-[480px] space-y-3 overflow-auto rounded-lg border border-white/10 bg-black/30 p-4">
              {result.files.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No PDF, video, or archive links found on this page.
                </p>
              ) : (
                result.files.map((fileUrl) => (
                  <div key={fileUrl} className="flex items-center gap-3 rounded-md border border-white/5 p-2">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-sm text-primary hover:underline"
                    >
                      {fileUrl}
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void downloadMedia(fileUrl)}
                    >
                      <Download className="h-4 w-4" />
                      Save
                    </Button>
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
