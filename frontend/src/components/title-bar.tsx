"use client";

import { Minus, Square, SquareStack, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

function WindowControl({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TitleBar() {
  const [visible, setVisible] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let disposed = false;
    const cleanups: Array<() => void> = [];

    async function init() {
      const { isTauri } = await import("@tauri-apps/api/core");
      if (!isTauri() || disposed) return;

      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();

      setVisible(true);
      setIsMaximized(await win.isMaximized());
      setIsFullscreen(await win.isFullscreen());

      const unlistenResize = await win.onResized(async () => {
        setIsMaximized(await win.isMaximized());
      });
      cleanups.push(unlistenResize);

      async function toggleFullscreen() {
        const next = !(await win.isFullscreen());
        await win.setFullscreen(next);
        setIsFullscreen(next);
      }

      function onKeyDown(event: KeyboardEvent) {
        if (event.key === "F11") {
          event.preventDefault();
          void toggleFullscreen();
        }
      }

      window.addEventListener("keydown", onKeyDown);
      cleanups.push(() => window.removeEventListener("keydown", onKeyDown));
    }

    void init();

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  async function withWindow(action: (win: import("@tauri-apps/api/window").Window) => Promise<void>) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await action(getCurrentWindow());
  }

  if (!visible || isFullscreen) {
    return null;
  }

  return (
    <header className="flex h-9 shrink-0 select-none items-stretch border-b border-border/80 bg-card/90 backdrop-blur-md">
      <div
        data-tauri-drag-region
        onDoubleClick={() => {
          void withWindow(async (win) => {
            await win.toggleMaximize();
            setIsMaximized(await win.isMaximized());
          });
        }}
        className="flex min-w-0 flex-1 items-center gap-2 px-3"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
          OmniParse
        </span>
        <span className="truncate text-xs text-muted-foreground">Universal Page-to-Data Extractor</span>
      </div>

      <div className="flex items-stretch">
        <WindowControl
          label="Minimize"
          onClick={() => {
            void withWindow((win) => win.minimize());
          }}
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.25} />
        </WindowControl>

        <WindowControl
          label={isMaximized ? "Restore" : "Maximize"}
          onClick={() => {
            void withWindow(async (win) => {
              await win.toggleMaximize();
              setIsMaximized(await win.isMaximized());
            });
          }}
        >
          {isMaximized ? (
            <SquareStack className="h-3 w-3" strokeWidth={2.25} />
          ) : (
            <Square className="h-3 w-3" strokeWidth={2.25} />
          )}
        </WindowControl>

        <WindowControl
          label="Close"
          onClick={() => {
            void withWindow((win) => win.close());
          }}
          className="hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </WindowControl>
      </div>
    </header>
  );
}
