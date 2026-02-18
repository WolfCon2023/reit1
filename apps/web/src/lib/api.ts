const API_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "";

export function getBaseUrl(): string {
  return API_URL;
}

type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown };

function clearAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("reit-auth");
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = localStorage.getItem("accessToken");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const { body, ...rest } = options;
  const serializedBody =
    body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    body: serializedBody,
  });
  if (res.status === 401) {
    clearAuth();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || res.statusText);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function apiBlob(path: string): Promise<Blob> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    clearAuth();
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}
