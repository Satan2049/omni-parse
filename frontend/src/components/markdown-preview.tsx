"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

export function MarkdownPreview({ markdown, className }: MarkdownPreviewProps) {
  return (
    <div
      className={`prose prose-invert max-w-none overflow-auto px-4 py-3 text-sm leading-relaxed prose-headings:text-foreground prose-p:text-foreground/90 prose-a:text-primary prose-code:text-accent prose-pre:bg-black/40 ${className ?? ""}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
