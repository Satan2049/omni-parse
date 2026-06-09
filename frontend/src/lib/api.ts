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
  files: string[];
  output_format: OutputFormat;
}

export interface ExtractRequest {
  url?: string;
  html?: string;
  base_url?: string;
  render_js?: boolean;
  extract_images?: boolean;
  resolve_fullsize_images?: boolean;
  resolve_deep?: boolean;
  output_format?: OutputFormat;
}

export interface HealthResponse {
  status: string;
  version: string;
}

export interface AppSettings {
  request_timeout_seconds: number;
  playwright_timeout_ms: number;
  playwright_image_timeout_ms: number;
  max_lightbox_clicks: number;
  max_gallery_pages: number;
  verify_image_sizes: boolean;
  max_html_size_bytes: number;
  allow_private_network_urls: boolean;
}

export interface ConvertResult {
  blob: Blob;
  filename: string;
}

function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "__TAURI_INTERNALS__" in window ||
    "__TAURI__" in window ||
    window.location.protocol === "tauri:" ||
    window.location.hostname === "tauri.localhost"
  );
}

function apiBase(): string {
  if (isTauriRuntime()) {
    return "http://127.0.0.1:8000";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

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

export async function fetchSettings(): Promise<AppSettings> {
  const response = await fetch(`${apiBase()}/settings`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<AppSettings>;
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const response = await fetch(`${apiBase()}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<AppSettings>;
}

export async function checkHealth(): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${apiBase()}/health`, { cache: "no-store" });
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
  const response = await fetch(`${apiBase()}/extract`, {
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
  const response = await fetch(`${apiBase()}/convert`, {
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

export async function downloadMedia(mediaUrl: string): Promise<void> {
  const response = await fetch(
    `${apiBase()}/images/download?url=${encodeURIComponent(mediaUrl)}`,
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const blob = await response.blob();
  const filename =
    parseContentDisposition(response.headers.get("Content-Disposition")) ?? "download";
  triggerDownload(blob, filename);
}

export async function downloadImage(imageUrl: string): Promise<void> {
  const response = await fetch(
    `${apiBase()}/images/download?url=${encodeURIComponent(imageUrl)}`,
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const blob = await response.blob();
  const filename =
    parseContentDisposition(response.headers.get("Content-Disposition")) ?? "image";
  triggerDownload(blob, filename);
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
