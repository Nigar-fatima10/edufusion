"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, UploadCloud, X } from "lucide-react";
import { ACCEPT, KIND_LABEL, MAX_BYTES, classify, formatBytes, type Kind } from "@/lib/fileTypes";
import { uploadFile, type UploadHandle } from "@/lib/api";

type Status = "uploading" | "done" | "error";
type Item = {
  id: string;
  name: string;
  size: number;
  kind: Kind | null;
  status: Status;
  progress: number;
  error?: string;
};

export default function UploadPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [filter, setFilter] = useState<"all" | "document" | "media" | "code">("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const handles = useRef<Map<string, UploadHandle>>(new Map());

  const patch = useCallback((id: string, changes: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  }, []);

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      Array.from(list).forEach((file) => {
        const id = crypto.randomUUID();
        const kind = classify(file);
        const base = { id, name: file.name, size: file.size, kind, progress: 0 };

        if (!kind) {
          setItems((p) => [...p, { ...base, status: "error", error: "This file type isn't supported." }]);
          return;
        }
        if (file.size > MAX_BYTES) {
          setItems((p) => [...p, { ...base, status: "error", error: "File is larger than 250 MB." }]);
          return;
        }

        setItems((p) => [...p, { ...base, status: "uploading" }]);
        const handle = uploadFile(file, (pct) => patch(id, { progress: pct }));
        handles.current.set(id, handle);
        handle.promise
          .then(() => patch(id, { status: "done", progress: 100 }))
          .catch((e: Error) => patch(id, { status: "error", error: e.message }))
          .finally(() => handles.current.delete(id));
      });
    },
    [patch]
  );

  const group = (k: Kind | null) => (k === "document" ? "document" : k === "code" ? "code" : k ? "media" : "all");
  const shown = items.filter((i) => filter === "all" || group(i.kind) === filter);

  function remove(id: string) {
    handles.current.get(id)?.abort();
    handles.current.delete(id);
    setItems((p) => p.filter((i) => i.id !== id));
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging ? "border-accent bg-accent/10" : "border-line bg-surface"
        }`}
      >
        <UploadCloud size={36} className="text-accent" aria-hidden />
        <p className="mt-4 text-lg font-semibold">Drop files here</p>
        <p className="mt-1 max-w-md text-sm text-muted">
          PDFs, notes, images of handwriting, lecture audio or video, and source code. Up to 250 MB each.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-6 rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          aria-label="Choose files to upload"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </div>

      <div role="tablist" aria-label="Filter materials" className="mt-6 flex gap-1">
        {([["all", "All files"], ["document", "Documents"], ["media", "Media"], ["code", "Code"]] as const).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={filter === k}
            onClick={() => setFilter(k)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === k ? "bg-accent/15 text-accent" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nothing uploaded yet. Drop a file above to add it to your knowledge base.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
          {shown.map((i) => (
            <li key={i.id} className="flex items-center gap-4 px-4 py-3">
              <FileText size={20} className="shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{i.name}</p>
                <p className="text-xs text-muted">
                  {i.kind ? KIND_LABEL[i.kind] : "Unknown"} · {formatBytes(i.size)}
                </p>
                {i.status === "uploading" && (
                  <div
                    role="progressbar"
                    aria-valuenow={i.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Uploading ${i.name}`}
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
                  >
                    <div className="h-full bg-accent transition-[width]" style={{ width: `${i.progress}%` }} />
                  </div>
                )}
                {i.status === "error" && <p className="mt-1 text-xs text-danger">{i.error}</p>}
              </div>
              {i.status === "done" && <CheckCircle2 size={20} className="text-accent" aria-label="Uploaded" />}
              {i.status === "error" && <AlertCircle size={20} className="text-danger" aria-label="Failed" />}
              <button
                type="button"
                onClick={() => remove(i.id)}
                aria-label={i.status === "uploading" ? `Cancel upload of ${i.name}` : `Remove ${i.name}`}
                className="rounded-md p-1 text-muted transition-colors hover:text-ink"
              >
                <X size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
