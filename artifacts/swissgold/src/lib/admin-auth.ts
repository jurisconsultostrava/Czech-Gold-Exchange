import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "sg_admin_token";

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}

export function initAdminAuth(): void {
  setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));
}

export function adminApiBase(): string {
  return import.meta.env.BASE_URL;
}
