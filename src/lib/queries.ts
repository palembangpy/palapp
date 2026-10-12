import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { asArray, errMsg, get, post, session } from "@/lib/http";
import { notify } from "@/lib/notify";
import { queryClient } from "@/lib/queryClient";
import type {
  Certificate,
  CommunityEvent,
  Partner,
  Project,
  PublicStats,
  Registration,
  Speaker,
  Token,
  User,
} from "@/lib/types";

export const isAuthed = () => !!session.token();

export const useStats = () => useQuery({ queryKey: ["stats"], queryFn: () => get<PublicStats>("/stats"), retry: 1 });
export const useEvents = (includeDeleted = false) =>
  useQuery({ queryKey: ["events", includeDeleted], queryFn: () => get<CommunityEvent[]>("/events", { include_deleted: includeDeleted }) });
export const useSpeakers = (includeDeleted = false) =>
  useQuery({ queryKey: ["speakers", includeDeleted], queryFn: () => get<Speaker[]>("/speakers", { include_deleted: includeDeleted }) });
export const usePartners = (includeDeleted = false) =>
  useQuery({ queryKey: ["partners", includeDeleted], queryFn: () => get<Partner[]>("/partners", { include_deleted: includeDeleted }) });
export const useProjects = (featuredOnly = false) =>
  useQuery({ queryKey: ["projects", featuredOnly], queryFn: () => get<Project[]>("/projects", { featured_only: featuredOnly }) });

// Admin-only (Bearer token)
export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => get<User>("/auth/me"), enabled: isAuthed(), retry: false });
export const useUsers = (includeDeleted = false) => {
  const { data: me } = useMe();
  return useQuery({
    queryKey: ["users", includeDeleted],
    queryFn: () => get<User[]>("/users", { include_deleted: includeDeleted }),
    enabled: !!(me?.is_admin || me?.is_staff), // admin-only endpoint
    retry: false,
  });
};
export const useRegistrations = (eventId: string | null, live = false) =>
  useQuery({
    queryKey: ["registrations", eventId],
    queryFn: () => get<unknown>(`/events/${eventId}/registrations`).then((d) => asArray<Registration>(d)),
    enabled: isAuthed() && !!eventId,
    refetchInterval: live ? 5000 : false,
    retry: false,
  });
export const useUserCertificates = (id: string | null) =>
  useQuery({ queryKey: ["user-certs", id], queryFn: () => get<Certificate[]>(`/users/${id}/certificates`), enabled: isAuthed() && !!id, retry: false });
export const useUserEvents = (id: string | null) =>
  useQuery({
    queryKey: ["user-events", id],
    queryFn: () => get<unknown>(`/users/${id}/events`).then((d) => asArray<Registration & Partial<CommunityEvent>>(d)),
    enabled: isAuthed() && !!id,
    retry: false,
  });

/** Mutation that toasts and refreshes every cached query (resources are cross-linked). */
export function useAction<TVars, TRes = unknown>(fn: (v: TVars) => Promise<TRes>, success?: string | ((r: TRes) => string)) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      if (success) notify.success(typeof success === "function" ? success(r) : success);
      return qc.invalidateQueries();
    },
    onError: (e) => {
      notify.error(errMsg(e));
    },
  });
}

export async function login(username: string, password: string) {
  const body = new URLSearchParams({ username, password, grant_type: "password" });
  const t = await post<Token>("/auth/login", body);
  session.setToken(t.access_token);
  queryClient.clear();
}

export function enterGuest() {
  session.setGuest();
  queryClient.clear();
}

export function logout() {
  session.clear();
  queryClient.clear();
  window.location.assign("/login");
}

// ---------- Roles & dashboard mode ----------
export type Mode = "admin" | "speaker" | "member";
export const MODE_LABEL: Record<Mode, string> = { admin: "Admin", speaker: "Speaker", member: "Member" };

/** Roles derived from /auth/me (admin/staff flags) + whether the user appears in /speakers.
 *  The API has no role field: admin/staff ⊃ speaker ⊃ member. `role` is the highest one. */
export function useRole() {
  const me = useMe();
  const speakers = useSpeakers();
  const u = me.data;
  const roles: Mode[] = [];
  if (u) {
    if (u.is_admin || u.is_staff) roles.push("admin");
    if (speakers.data?.some((s) => s.user_id === u.id && !s.deleted_at)) roles.push("speaker");
    roles.push("member");
  }
  const role: Mode = roles[0] ?? "member";
  return { me: u, roles, role, isAdmin: roles.includes("admin"), isSpeaker: roles.includes("speaker"), isLoading: me.isLoading || speakers.isLoading || (isAuthed() && !me.data && !me.isError) };
}

/** Telegram Mini App sign-in: window.Telegram.WebApp.initData → POST /auth/telegram. */
export const telegramInitData = (): string =>
  (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData ?? "";

export async function loginWithTelegram(initData: string) {
  const t = await post<Token>("/auth/telegram", { init_data: initData });
  session.setToken(t.access_token);
  queryClient.clear();
}
