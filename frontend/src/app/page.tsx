import { ApiStatus } from "@/components/api-status";
import { ExtractorWorkspace } from "@/components/extractor-workspace";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-grid-glow">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.55))]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-8 md:px-8">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">
              OmniParse
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
              Universal Page-to-Data Extractor
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Turn any URL or HTML into clean Markdown, JSON, or plain text — built for
              developers and AI researchers who need RAG-ready data.
            </p>
          </div>
          <ApiStatus />
        </header>

        <ExtractorWorkspace />
      </div>
    </main>
  );
}
