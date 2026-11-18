"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Download, FileText, LoaderCircle, Copy } from "lucide-react";
import {
  generateSummary,
  searchMaterials,
  type Material,
  type SummaryLength,
  type SummaryResult,
} from "@/lib/api";
import { getSession } from "@/lib/auth";
import { formatBytes } from "@/lib/fileTypes";

type SavedSummary = SummaryResult & { id: string; created_at: string };
type SourceMode = "text" | "material";

function isSavedSummary(value: unknown): value is SavedSummary {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.summary === "string" &&
    typeof item.length === "string" &&
    typeof item.source_name === "string" &&
    typeof item.route === "string" &&
    typeof item.model === "string" &&
    typeof item.duration_ms === "number" &&
    typeof item.created_at === "string"
  );
}

export default function SummarizePage() {
  const [mode, setMode] = useState<SourceMode>("text");
  const [text, setText] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialId, setMaterialId] = useState("");
  const [length, setLength] = useState<SummaryLength>("medium");
  const [active, setActive] = useState<SavedSummary | null>(null);
  const [history, setHistory] = useState<SavedSummary[]>([]);
  const [historyKey, setHistoryKey] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [materialsLoading, setMaterialsLoading] = useState(true);

  useEffect(() => {
    const email = getSession()?.email.toLowerCase() ?? "local";
    const key = `edufusion-summaries:${email}`;
    setHistoryKey(key);
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed) || !parsed.every(isSavedSummary)) {
          throw new Error("Saved summary history has an unexpected format.");
        }
        setHistory(parsed);
      }
    } catch {
      setError("Saved summaries could not be read from this browser.");
    }
    setHistoryLoaded(true);
  }, []);

  useEffect(() => {
    searchMaterials()
      .then(setMaterials)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Uploaded materials could not be loaded.");
      })
      .finally(() => setMaterialsLoading(false));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const input = mode === "material" ? { material_id: materialId } : { text: text.trim() };
      const result = await generateSummary(input, length);
      const saved: SavedSummary = {
        ...result,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      const updated = [saved, ...history].slice(0, 20);
      setActive(saved);
      setHistory(updated);
      try {
        window.localStorage.setItem(historyKey, JSON.stringify(updated));
      } catch {
        setNotice("Summary generated, but this browser could not save it to history.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The summary could not be generated.");
    } finally {
      setBusy(false);
    }
  }

  async function copySummary() {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.summary);
      setNotice("Summary copied to clipboard.");
      setError("");
    } catch {
      setError("Clipboard access failed. Select and copy the summary text instead.");
    }
  }

  function downloadSummary() {
    if (!active) return;
    const blob = new Blob([active.summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${active.source_name.replace(/[^\w.-]+/g, "-")}-summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Summary downloaded.");
    setError("");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight">Summarize material</h1>
      <p className="mb-8 mt-2 text-muted">
        Create a short, medium, or detailed summary from text, transcripts, or an uploaded document.
        Processing stays on your local AI service.
      </p>

      <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-line bg-surface p-5 md:p-6">
        <fieldset>
          <legend className="text-sm font-semibold">Choose a source</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {([
              ["text", "Paste text or transcript"],
              ["material", "Choose uploaded material"],
            ] as const).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="summary-source"
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                  className="accent-accent"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {mode === "text" ? (
          <div>
            <label htmlFor="summary-text" className="text-sm font-medium">Text to summarize</label>
            <textarea
              id="summary-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={250000}
              rows={9}
              placeholder="Paste notes, an audio/video transcript, or other text here..."
              className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm"
              required
            />
            <p className="mt-1 text-right text-xs text-muted">{text.length.toLocaleString()} / 250,000 characters</p>
          </div>
        ) : (
          <div>
            <label htmlFor="summary-material" className="text-sm font-medium">Uploaded material</label>
            <select
              id="summary-material"
              value={materialId}
              onChange={(event) => setMaterialId(event.target.value)}
              disabled={materialsLoading || materials.length === 0}
              required
              className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm"
            >
              <option value="">
                {materialsLoading ? "Loading materials..." : materials.length ? "Select a file" : "No uploaded materials"}
              </option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} ({formatBytes(material.size)})
                </option>
              ))}
            </select>
            {!materialsLoading && materials.length === 0 && (
              <p className="mt-2 text-sm text-muted">
                Upload a PDF, DOCX, PPTX, or text-based file in{" "}
                <Link href="/materials" className="font-medium text-accent underline">My materials</Link>.
                Audio and video files need a transcript; paste the transcript above.
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="summary-length" className="text-sm font-medium">Summary length</label>
          <select
            id="summary-length"
            value={length}
            onChange={(event) => setLength(event.target.value as SummaryLength)}
            className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm"
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="detailed">Detailed</option>
          </select>
        </div>

        {error && <p role="alert" className="rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger">{error}</p>}
        {notice && <p role="status" className="text-sm text-muted">{notice}</p>}

        <button
          type="submit"
          disabled={busy || !historyLoaded || (mode === "material" && !materialId) || (mode === "text" && !text.trim())}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <><LoaderCircle size={17} className="animate-spin" /> Generating locally...</> : <><FileText size={17} /> Generate summary</>}
        </button>
      </form>

      {active && (
        <section aria-labelledby="summary-result" className="mt-8 rounded-xl border border-line bg-surface p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="summary-result" className="text-xl font-semibold">{active.source_name}</h2>
              <p className="mt-1 text-xs text-muted">
                {active.length} · {active.route} · {active.model} · {(active.duration_ms / 1000).toFixed(1)} seconds
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={copySummary} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-bg">
                <Copy size={15} /> Copy
              </button>
              <button type="button" onClick={downloadSummary} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-bg">
                <Download size={15} /> Download
              </button>
            </div>
          </div>
          <div className="mt-5 whitespace-pre-wrap text-sm leading-7">{active.summary}</div>
        </section>
      )}

      {historyLoaded && history.length > 0 && (
        <section aria-labelledby="summary-history" className="mt-8">
          <h2 id="summary-history" className="font-semibold">Recent summaries</h2>
          <p className="mt-1 text-xs text-muted">Saved in this browser for this account.</p>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(item);
                    setError("");
                    setNotice("");
                  }}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-bg"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.source_name}</span>
                    <span className="text-xs text-muted">{item.length} summary</span>
                  </span>
                  <time className="shrink-0 text-xs text-muted" dateTime={item.created_at}>
                    {new Date(item.created_at).toLocaleString()}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
