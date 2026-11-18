const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type UploadHandle = { promise: Promise<void>; abort: () => void };
export type Material = { id: string; name: string; size: number };
export type SummaryLength = "short" | "medium" | "detailed";
export type SummaryResult = {
  summary: string;
  length: SummaryLength;
  source_name: string;
  route: string;
  model: string;
  duration_ms: number;
};

/**
 * Uploads one file to the FastAPI gateway: POST {API_URL}/api/upload (multipart, field "file").
 * If NEXT_PUBLIC_API_URL is empty, a mock uploader runs so the UI works without a backend.
 */
export function uploadFile(file: File, onProgress: (pct: number) => void): UploadHandle {
  if (!API_URL) return mockUpload(onProgress);

  const xhr = new XMLHttpRequest();
  const promise = new Promise<void>((resolve, reject) => {
    xhr.open("POST", `${API_URL}/api/upload`);
    // TODO (auth): xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Server returned ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error. Check your connection."));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });

  return { promise, abort: () => xhr.abort() };
}

export async function searchMaterials(query: string = ""): Promise<Material[]> {
  if (!API_URL) return [];

  const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  const response = await fetch(`${API_URL}/api/materials${params}`);
  if (!response.ok) throw new Error("Couldn't load uploaded materials.");
  return response.json();
}

export async function generateSummary(
  input: { material_id: string } | { text: string },
  length: SummaryLength
): Promise<SummaryResult> {
  if (!API_URL) throw new Error("The backend URL is not configured.");

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, length }),
    });
  } catch {
    throw new Error("Can't reach the summarization service. Check that Docker services are running.");
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? "The summary could not be generated.");
  }
  return body as SummaryResult;
}

function mockUpload(onProgress: (pct: number) => void): UploadHandle {
  let timer: ReturnType<typeof setInterval>;
  let pct = 0;
  let rejectFn: (e: Error) => void;

  const promise = new Promise<void>((resolve, reject) => {
    rejectFn = reject;
    timer = setInterval(() => {
      pct = Math.min(100, pct + 8 + Math.random() * 12);
      onProgress(Math.round(pct));
      if (pct >= 100) {
        clearInterval(timer);
        resolve();
      }
    }, 150);
  });

  return {
    promise,
    abort: () => {
      clearInterval(timer);
      rejectFn(new Error("Upload cancelled"));
    },
  };
}
