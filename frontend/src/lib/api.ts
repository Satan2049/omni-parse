export type OutputFormat = "md" | "json" | "txt";
export type ConvertFormat = "pdf" | "txt" | "md";

export interface PageMetadata {
  author?: string | null;
  date?: string | null;
  sitename?: string | null;
  description?: string | null;
  language?: string | null;
  categories?: string[];
  tags?: string[];
  hostname?: string | null;
  source_url?: string | null;
}

export interface ExtractResponse {
  title: string;
  content_markdown: string;
  content_json?: Record<string, unknown> | null;
  content_text?: string | null;
  metadata: PageMetadata;
  images: string[];
  output_format: OutputFormat;
}

export interface ExtractRequest {
  url?: string;
  html?: string;
  base_url?: string;
  render_js?: boolean;
  extract_images?: boolean;
  output_format?: OutputFormat;
}

export interface HealthResponse {
  status: string;
  version: string;
}

export interface ConvertResult {
  blob: Blob;
  filename: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string | { msg?: string }[] };
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((item) => item.msg ?? "Validation error").join(", ");
    }
  } catch {
    // fall through
  }
  return `Request failed with status ${response.status}`;
}

function parseContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="([^"]+)"/.exec(header);
  return match?.[1] ?? null;
}

export async function checkHealth(): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    if (!response.ok) return null;
    return response.json() as Promise<HealthResponse>;
  } catch {
    return null;
  }
}

export async function extractContent(
  payload: ExtractRequest,
  signal?: AbortSignal,
): Promise<ExtractResponse> {
  const response = await fetch(`${API_BASE}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<ExtractResponse>;
}

export async function convertContent(
  content: string,
  targetFormat: ConvertFormat,
  title: string,
): Promise<ConvertResult> {
  const response = await fetch(`${API_BASE}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      target_format: targetFormat,
      title,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const blob = await response.blob();
  const filename =
    parseContentDisposition(response.headers.get("Content-Disposition")) ??
    `${title}.${targetFormat}`;

  return { blob, filename };
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
