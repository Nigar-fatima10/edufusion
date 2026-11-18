export type Kind = "document" | "image" | "audio" | "video" | "code";

export const MAX_BYTES = 250 * 1024 * 1024; // 250 MB per file

const EXT: Record<Kind, string[]> = {
  document: ["pdf", "txt", "md", "docx"],
  image: ["png", "jpg", "jpeg", "webp", "gif"],
  audio: ["mp3", "wav", "m4a", "ogg"],
  video: ["mp4", "mov", "webm", "mkv"],
  code: [
    "py", "js", "ts", "tsx", "jsx", "java", "c", "cpp", "h", "cs",
    "go", "rs", "rb", "php", "html", "css", "json", "ipynb", "sql", "sh",
  ],
};

export const KIND_LABEL: Record<Kind, string> = {
  document: "Document",
  image: "Image",
  audio: "Audio",
  video: "Video",
  code: "Code",
};

/** Value for <input accept="...">. */
export const ACCEPT = Object.values(EXT)
  .flat()
  .map((e) => `.${e}`)
  .join(",");

export function classify(file: File): Kind | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  for (const kind of Object.keys(EXT) as Kind[]) {
    if (EXT[kind].includes(ext)) return kind;
  }
  return null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
