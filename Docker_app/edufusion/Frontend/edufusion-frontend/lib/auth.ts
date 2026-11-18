export type Session = { token: string; name: string; email: string };

const KEY = "edufusion-session";
const API = process.env.NEXT_PUBLIC_API_URL;

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
export function saveSession(s: Session) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
export function clearSession() {
  try { localStorage.removeItem(KEY); } catch {}
}

/**
 * Backend contract (Node/Express auth service):
 *   POST {API}/api/auth/login     { email, password }
 *   POST {API}/api/auth/register  { name, email, password }
 *   200 -> { token, user: { name, email } }     4xx -> { message }
 * With no NEXT_PUBLIC_API_URL a mock session is created so the UI can be demoed.
 */
export async function authRequest(
  mode: "login" | "register",
  data: { name: string; email: string; password: string }
): Promise<Session> {
  if (!API) {
    return { token: "mock-token", name: data.name || data.email.split("@")[0], email: data.email };
  }
  let res: Response;
  try {
    res = await fetch(`${API}/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? "Those details didn't work. Check them and try again.");
  return { token: body.token, name: body.user.name, email: body.user.email };
}
