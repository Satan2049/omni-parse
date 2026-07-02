"use client";

import { History, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { HistoryEntry } from "@/lib/history";
import { clearHistory, loadHistory, removeHistoryEntry } from "@/lib/history";
import { cn } from "@/lib/utils";

interface ExtractionHistoryProps {
  onRestore: (entry: HistoryEntry) => void;
}

export function ExtractionHistory({ onRestore }: ExtractionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadHistory());

  useEffect(() => {
    function refresh() {
      setEntries(loadHistory());
    }
    window.addEventListener("omniparse-history-changed", refresh);
    return () => window.removeEventListener("omniparse-history-changed", refresh);
  }, []);

  function refresh() {
    setEntries(loadHistory());
  }

  function handleClear() {
    clearHistory();
    refresh();
  }

  function handleRemove(id: string) {
    removeHistoryEntry(id);
    refresh();
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-secondary/40 px-4 py-3 text-sm font-medium transition hover:border-primary/40 hover:bg-secondary/60">
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          History ({entries.length})
        </span>
        <span className={cn("text-xs text-muted-foreground transition-transform", open && "rotate-180")}>
          ▼
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-2 rounded-lg border border-white/10 bg-secondary/20 p-3">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No extractions yet.</p>
        ) : (
          <>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4" />
                Clear all
              </Button>
            </div>
            <ul className="max-h-56 space-y-2 overflow-auto">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-2 rounded-md border border-white/5 bg-black/20 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.url ?? "Raw HTML"} · {entry.preset} ·{" "}
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onRestore(entry);
                      setOpen(false);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(entry.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function notifyHistoryChanged() {
  window.dispatchEvent(new CustomEvent("omniparse-history-changed"));
}
