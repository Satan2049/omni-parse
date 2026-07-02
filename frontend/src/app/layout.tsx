import type { Metadata } from "next";

import { TitleBar } from "@/components/title-bar";

import "./globals.css";

export const metadata: Metadata = {
  title: "OmniParse — Universal Page-to-Data Extractor",
  description:
    "Convert any URL or HTML into clean Markdown, JSON, or Text for RAG pipelines and AI training.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen flex-col overflow-hidden">
        <TitleBar />
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </body>
    </html>
  );
}
