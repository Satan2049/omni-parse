"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

interface VirtualizedTextProps {
  text: string;
  className?: string;
}

export function VirtualizedText({ text, className }: VirtualizedTextProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const lines = text.split("\n");

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 22,
    overscan: 12,
  });

  return (
    <div ref={parentRef} className={`overflow-auto ${className ?? ""}`}>
      <div
        className="relative w-full font-mono text-sm leading-relaxed text-foreground/90"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            className="absolute left-0 top-0 w-full whitespace-pre-wrap px-4"
            style={{ transform: `translateY(${item.start}px)` }}
          >
            {lines[item.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
