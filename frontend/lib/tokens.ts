const KEY = (match_id: number) => `nexus_token_${match_id}`;

interface StoredToken {
  token: string;
  expires_at: string;
}

export function saveToken(
  match_id: number,
  token: string,
  expires_at: string
): void {
  if (typeof window === "undefined") return;
  const data: StoredToken = { token, expires_at };
  localStorage.setItem(KEY(match_id), JSON.stringify(data));
}

export function getToken(match_id: number): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY(match_id));
  if (!raw) return null;
  try {
    const data: StoredToken = JSON.parse(raw);
    if (new Date(data.expires_at) <= new Date()) {
      localStorage.removeItem(KEY(match_id));
      return null;
    }
    return data.token;
  } catch {
    return null;
  }
}

export function clearToken(match_id: number): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY(match_id));
}
