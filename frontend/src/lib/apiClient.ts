import { supabase } from './supabase';

let authToken: string | null = null;

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export async function authHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const fullUrl = API_BASE ? `${API_BASE}${url}` : url;
  const headers = await authHeaders();

  return fetch(fullUrl, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
    },
  });
}
