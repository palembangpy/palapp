import axios, { AxiosError } from "axios";
import { queryClient } from "@/lib/queryClient";

// External PalembangPy FastAPI backend — base URL comes from frontend/.env (VITE_API_URL).
export const API_URL = import.meta.env.VITE_API_URL;
export const API_ORIGIN = API_URL ? new URL(API_URL).origin : "";

const TOKEN_KEY = "ppy_token";
const GUEST_KEY = "ppy_guest";

export const session = {
  token: () => localStorage.getItem(TOKEN_KEY),
  isGuest: () => sessionStorage.getItem(GUEST_KEY) === "1",
  setToken: (t: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    sessionStorage.removeItem(GUEST_KEY);
  },
  setGuest: () => sessionStorage.setItem(GUEST_KEY, "1"),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(GUEST_KEY);
  },
};

export const http = axios.create({ baseURL: API_URL, timeout: 20000 });

http.interceptors.request.use((cfg) => {
  const t = session.token();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

http.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    // Expired / invalid token (checked via /auth/me): drop it and go back to login.
    // Other 401/403s just mean "this role can't access that endpoint" and stay local errors.
    if (err.response?.status === 401 && session.token() && err.config?.url?.includes("/auth/me")) {
      session.clear();
      queryClient.clear();
      if (window.location.pathname !== "/login") window.location.assign("/login?expired=1");
    }
    return Promise.reject(err);
  },
);

export const get = <T>(url: string, params?: Record<string, unknown>) => http.get<T>(url, { params }).then((r) => r.data);
export const post = <T>(url: string, body?: unknown) => http.post<T>(url, body).then((r) => r.data);
export const patch = <T>(url: string, body?: unknown) => http.patch<T>(url, body).then((r) => r.data);
export const del = <T>(url: string) => http.delete<T>(url).then((r) => r.data);

export function errMsg(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = (e.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      const first = d[0] as { loc?: unknown[]; msg?: string } | undefined;
      return first?.msg ? `${(first.loc ?? []).slice(-1).join("")}: ${first.msg}` : "Data tidak valid";
    }
    if (e.response) return `Server error (${e.response.status})`;
    return "Tidak bisa terhubung ke server API PalembangPy";
  }
  return "Terjadi kesalahan";
}

/** Some endpoints have untyped responses — accept a bare array or the first array inside an object. */
export function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const arr = Object.values(data).find(Array.isArray);
    if (arr) return arr as T[];
  }
  return [];
}
