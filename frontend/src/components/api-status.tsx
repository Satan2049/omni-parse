"use client";

import { useEffect, useState } from "react";

import { checkHealth, type HealthResponse } from "@/lib/api";

export function ApiStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    void checkHealth().then((response) => {
      setHealth(response);
      setChecked(true);
    });
  }, []);

  if (!checked) {
    return (
      <div className="glass-panel rounded-full px-4 py-2 text-sm text-muted-foreground">
        Checking API…
      </div>
    );
  }

  if (!health) {
    return (
      <div className="rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive-foreground">
        API offline — start the backend with start.bat
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
