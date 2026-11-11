const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type UploadHandle = { promise: Promise<void>; abort: () => void };

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
