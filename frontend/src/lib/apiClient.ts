let authToken: string | null = null;

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function authHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

export function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const fullUrl = API_BASE ? `${API_BASE}${url}` : url;
  return fetch(fullUrl, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
}
