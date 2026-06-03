import type { ConvertFormat, ExtractResponse, OutputFormat } from "@/lib/api";

export function buildJsonPayload(result: ExtractResponse): Record<string, unknown> {
  if (result.content_json) {
    return result.content_json;
  }

  return {
    title: result.title,
    content_markdown: result.content_markdown,
    content_text: result.content_text ?? result.content_markdown,
    metadata: result.metadata,
  };
}

export function getPreviewContent(result: ExtractResponse, outputFormat: OutputFormat): string {
  if (outputFormat === "json") {
    return JSON.stringify(buildJsonPayload(result), null, 2);
  }
  if (outputFormat === "txt") {
    return result.content_text ?? result.content_markdown;
  }
  return result.content_markdown;
}

export type DownloadKind = ConvertFormat | "json";

export function getDownloadContent(result: ExtractResponse, kind: DownloadKind): string {
  if (kind === "json") {
    return JSON.stringify(buildJsonPayload(result), null, 2);
  }
  if (kind === "txt") {
    return result.content_text ?? result.content_markdown;
  }
  return result.content_markdown;
}

export function sanitizeFilename(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.slice(0, 80) || "omniparse-export";
}
