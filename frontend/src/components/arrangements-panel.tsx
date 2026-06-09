"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Save, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  fetchSettings,
  saveSettings,
  type AppSettings,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const DEFAULT_SETTINGS: AppSettings = {
  request_timeout_seconds: 30,
  playwright_timeout_ms: 60000,
  playwright_image_timeout_ms: 5000,
  max_lightbox_clicks: 20,
  max_gallery_pages: 12,
  verify_image_sizes: false,
  max_html_size_bytes: 5_000_000,
  allow_private_network_urls: false,
};

interface ArrangementsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArrangementsPanel({ open, onOpenChange }: ArrangementsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void fetchSettings()
      .then((response) => {
        setSettings(response);
        setLoaded(true);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load arrangements");
        setLoaded(true);
      });
  }, []);

  function updateNumber<K extends keyof AppSettings>(key: K, raw: string) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    setSettings((current) => ({ ...current, [key]: parsed }));
    setSaveMessage(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const saved = await saveSettings(settings);
      setSettings(saved);
      setSaveMessage("Arrangements saved");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save arrangements");
    } finally {
      setIsSaving(false);
    }
  }

  const maxHtmlMb = (settings.max_html_size_bytes / 1_000_000).toFixed(1);

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-secondary/40 px-4 py-3 text-sm font-medium transition hover:border-primary/40 hover:bg-secondary/60">
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Arrangements
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-4 rounded-lg border border-white/10 bg-secondary/20 p-4">
        <p className="text-xs text-muted-foreground">
          Server-side limits and timeouts. Changes apply immediately and are saved to{" "}
          <code>%LOCALAPPDATA%\OmniParse\.env</code>.
        </p>

        {loadError ? (
          <p className="text-sm text-destructive-foreground">{loadError}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="request-timeout">Request Timeout (seconds)</Label>
            <Input
              id="request-timeout"
              type="number"
              min={5}
              max={300}
              step={1}
              disabled={!loaded}
              value={settings.request_timeout_seconds}
              onChange={(event) => updateNumber("request_timeout_seconds", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playwright-timeout">Playwright Timeout (ms)</Label>
            <Input
              id="playwright-timeout"
              type="number"
              min={5000}
              max={300000}
              step={1000}
              disabled={!loaded}
              value={settings.playwright_timeout_ms}
              onChange={(event) => updateNumber("playwright_timeout_ms", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-timeout">Image Click Timeout (ms)</Label>
            <Input
              id="image-timeout"
              type="number"
              min={1000}
              max={30000}
              step={500}
              disabled={!loaded}
              value={settings.playwright_image_timeout_ms}
              onChange={(event) =>
                updateNumber("playwright_image_timeout_ms", event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-gallery-pages">Max Gallery Pages</Label>
            <Input
              id="max-gallery-pages"
              type="number"
              min={1}
              max={50}
              step={1}
              disabled={!loaded}
              value={settings.max_gallery_pages}
              onChange={(event) => updateNumber("max_gallery_pages", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-lightbox-clicks">Max Lightbox Clicks</Label>
            <Input
              id="max-lightbox-clicks"
              type="number"
              min={1}
              max={100}
              step={1}
              disabled={!loaded}
              value={settings.max_lightbox_clicks}
              onChange={(event) => updateNumber("max_lightbox_clicks", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-html-size">Max HTML Size (MB)</Label>
            <Input
              id="max-html-size"
              type="number"
              min={0.1}
              max={50}
              step={0.1}
              disabled={!loaded}
              value={maxHtmlMb}
              onChange={(event) => {
                const mb = Number(event.target.value);
                if (!Number.isFinite(mb)) return;
                setSettings((current) => ({
                  ...current,
                  max_html_size_bytes: Math.round(mb * 1_000_000),
                }));
                setSaveMessage(null);
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="verify-image-sizes">Verify Image Sizes</Label>
            <p className="text-xs text-muted-foreground">
              Extra HEAD requests during deep gallery crawl to confirm larger assets.
            </p>
          </div>
          <Switch
            id="verify-image-sizes"
            disabled={!loaded}
            checked={settings.verify_image_sizes}
            onCheckedChange={(value) => {
              setSettings((current) => ({ ...current, verify_image_sizes: value }));
              setSaveMessage(null);
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3">
          <div>
            <Label htmlFor="allow-private-networks">Allow Private Network URLs</Label>
            <p className="text-xs text-muted-foreground">
              Disables SSRF protection so LAN, NAS, and local dev URLs can be extracted.
            </p>
          </div>
          <Switch
            id="allow-private-networks"
            disabled={!loaded}
            checked={settings.allow_private_network_urls}
            onCheckedChange={(value) => {
              setSettings((current) => ({ ...current, allow_private_network_urls: value }));
              setSaveMessage(null);
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button disabled={!loaded || isSaving} onClick={() => void handleSave()}>
            <Save className="h-4 w-4" />
            Save Arrangements
          </Button>
          {saveMessage ? <span className="text-xs text-primary">{saveMessage}</span> : null}
          {saveError ? (
            <span className="text-xs text-destructive-foreground">{saveError}</span>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
