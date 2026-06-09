"use client";

import { useEffect, useState } from "react";

import { checkHealth, type HealthResponse } from "@/lib/api";

const BOOT_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 2_000;

export function ApiStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function pollHealth() {
      while (!cancelled && Date.now() - startedAt < BOOT_TIMEOUT_MS) {
        const response = await checkHealth();
        if (response) {
          if (!cancelled) {
            setHealth(response);
            setChecked(true);
          }
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
      }

      if (!cancelled) {
        setHealth(null);
        setChecked(true);
      }
    }

    void pollHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) {
    return (
      <div className="glass-panel rounded-full px-4 py-2 text-sm text-muted-foreground">
        Starting API… first launch can take up to a minute
      </div>
    );
  }

  if (!health) {
    return (
      <div className="rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive-foreground">
        API offline — close other OmniParse windows and restart the app
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-full px-4 py-2 text-sm text-muted-foreground">
      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary animate-pulseGlow" />
      API v{health.version} · {health.status}
    </div>
  );
}
