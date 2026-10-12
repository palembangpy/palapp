import { useState, type FormEvent, type ReactNode } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { Drawer, Dropdown, Tag } from "antd";
import { BadgeCheck, CalendarDays, Code2, Handshake, IdCard, LayoutDashboard, LogIn, LogOut, Menu, Mic2, Presentation, QrCode, Search, Users } from "lucide-react";
import type { User } from "@/lib/types";
import { Avatar } from "@/components/ui-kit";
import { session } from "@/lib/http";
import { MODE_LABEL, isAuthed, logout, useRole, type Mode } from "@/lib/queries";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Users; testid: string };
export const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/me", label: "Area Member", icon: IdCard, testid: "nav-member-area" },
  { to: "/speaker-hub", label: "Area Speaker", icon: Presentation, testid: "nav-speaker-area" },
  { to: "/members", label: "Kelola Member", icon: Users, testid: "nav-members" },
  { to: "/events", label: "Event", icon: CalendarDays, testid: "nav-events" },
  { to: "/speakers", label: "Speaker", icon: Mic2, testid: "nav-speakers" },
  { to: "/partners", label: "Partner", icon: Handshake, testid: "nav-partners" },
  { to: "/projects", label: "Project", icon: Code2, testid: "nav-projects" },
  { to: "/scan", label: "Scan Presensi", icon: QrCode, testid: "nav-scan" },
  { to: "/verify", label: "Verifikasi Sertifikat", icon: BadgeCheck, testid: "nav-verify" },
];

/** Page access per role. Admin/staff ⊃ speaker ⊃ member: admin sees everything, admin-only pages never show for others. */
export const ACCESS: Record<string, (Mode | "guest")[]> = {
  "/me": ["admin", "speaker"],
  "/speaker-hub": ["admin"],
  "/members": ["admin"],
  "/scan": ["admin"],
};
const can = (to: string, mode: Mode | "guest") => !ACCESS[to] || ACCESS[to].includes(mode);
const HOME_LABEL: Record<Mode | "guest", string> = { admin: "Dashboard Admin", speaker: "Dashboard Speaker", member: "Dashboard Saya", guest: "Dashboard" };
const navFor = (mode: Mode | "guest") => NAV.filter((n) => can(n.to, mode)).map((n) => (n.to === "/" ? { ...n, label: HOME_LABEL[mode] } : n));

export type ShellContext = { mode: Mode | "guest"; roles: Mode[]; me?: User; isAdmin: boolean; loading: boolean };
export const useShell = () => useOutletContext<ShellContext>();

/** Route guard: renders children only when the current role may open `path`; otherwise back to the role's dashboard. */
export function Guard({ path, children }: { path: string; children: ReactNode }) {
  const { mode, loading } = useShell();
  if (loading) return <div className="h-64 animate-pulse rounded-[28px] bg-white" data-testid="guard-loading" />;
  return can(path, mode) ? children : <Navigate to="/" replace />;
}

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <img src="/logo.png" alt="PalembangPy" data-testid="brand-logo" className={cn("rounded-2xl shadow-sm transition-transform duration-200 hover:-rotate-6 hover:scale-105", size === "lg" ? "size-14" : "size-12")} />
  );
}

function Sidebar({ nav }: { nav: NavItem[] }) {
  const authed = isAuthed();
  return (
    <aside className="sticky top-3 z-40 hidden h-[calc(100vh-3.5rem)] min-h-[620px] w-[84px] shrink-0 flex-col items-center justify-between rounded-[24px] border border-black/5 bg-white py-5 lg:flex" data-testid="sidebar">
      <div className="flex flex-col items-center gap-5">
        <NavLink to="/" data-testid="sidebar-logo" aria-label="PalembangPy">
          <Logo />
        </NavLink>
        <nav className="flex flex-col items-center gap-1.5">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              data-testid={n.testid}
              aria-label={n.label}
              className={({ isActive }) =>
                cn(
                  "group relative flex size-11 items-center justify-center rounded-2xl transition-[background-color,color,transform] duration-200 active:scale-95",
                  isActive ? "bg-ink text-white shadow-sm" : "bg-pill text-ink-2 hover:bg-[#EAEAEA] hover:text-ink",
                )
              }
            >
              <n.icon className="size-5" strokeWidth={1.9} />
              <span role="tooltip" className="pointer-events-none absolute left-[calc(100%+14px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-xl bg-ink px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                {n.label}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>
      <button
        onClick={() => (authed ? logout() : window.location.assign("/login"))}
        data-testid="sidebar-auth-button"
        aria-label={authed ? "Keluar" : "Masuk"}
        className="flex w-[60px] flex-col items-center gap-1 rounded-2xl border border-black/5 bg-butter px-1 py-2.5 text-[10px] font-semibold text-ink transition-transform duration-200 hover:-translate-y-0.5"
      >
        {authed ? <LogOut className="size-4" /> : <LogIn className="size-4" />}
        {authed ? "Keluar" : "Masuk"}
      </button>
    </aside>
  );
}

const TITLES: Record<string, string> = Object.fromEntries(NAV.map((n) => [n.to, n.label]));

const ROLE_TONE: Record<Mode, string> = { admin: "bg-ink text-white", speaker: "bg-butter text-ink", member: "bg-mint text-ink" };

function Topbar({ onMenu, ctx, nav }: { onMenu: () => void; ctx: ShellContext; nav: NavItem[] }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const me = ctx.me;
  const [q, setQ] = useState("");
  const authed = isAuthed();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/members?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <header className="mb-6 flex items-center gap-3">
      <button onClick={onMenu} className="flex size-11 items-center justify-center rounded-2xl bg-white text-ink lg:hidden" data-testid="mobile-menu-button" aria-label="Buka menu">
        <Menu className="size-5" />
      </button>
      <div className="hidden min-w-0 md:block">
        <p className="label-xs" data-testid="topbar-mode-label">PalembangPy · {ctx.mode === "guest" ? "Mode tamu" : `Dashboard ${MODE_LABEL[ctx.mode]}`}</p>
        <p className="truncate text-sm font-semibold text-ink" data-testid="topbar-section-name">{nav.find((n) => n.to === pathname)?.label ?? TITLES[pathname] ?? "Dashboard"}</p>
      </div>
      {ctx.mode !== "guest" && (
        <span className={cn("hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-block", ROLE_TONE[ctx.mode])} data-testid="topbar-role-badge">
          {ctx.mode === "admin" ? (me?.is_admin ? "Admin" : "Staff") : MODE_LABEL[ctx.mode]}
        </span>
      )}
      {ctx.isAdmin ? (
        <form onSubmit={submit} className="ml-auto flex min-w-0 flex-1 items-center md:max-w-xs">
          <label className="relative w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari member / kode PALPY..."
              data-testid="topbar-search-input"
              className="h-11 w-full rounded-2xl border border-black/5 bg-white pl-10 pr-3 text-sm text-ink outline-none transition-[box-shadow] placeholder:text-ink-3 focus:ring-2 focus:ring-ink/80"
            />
          </label>
        </form>
      ) : (
        <span className="ml-auto" />
      )}
      <Dropdown
        trigger={["click"]}
        menu={{
          items: authed
            ? [
                ...(ctx.mode !== "member" ? [{ key: "me", label: "Kartu & profil saya", onClick: () => navigate(ctx.mode === "admin" || ctx.mode === "speaker" ? "/me" : "/") }] : []),
                { key: "out", label: "Keluar", danger: true, onClick: logout },
              ]
            : [{ key: "in", label: "Masuk", onClick: () => navigate("/login") }],
        }}
      >
        <button className="flex items-center gap-2.5 rounded-2xl bg-white py-1.5 pl-1.5 pr-3 transition-transform hover:-translate-y-0.5" data-testid="topbar-profile-button">
          <span className="relative">
            <Avatar src={me?.avatar_url} name={me?.name ?? "Tamu"} className="size-8" />
            <span className={cn("absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-white", authed ? "bg-[#12B76A]" : "bg-[#F5CF4B]")} />
          </span>
          <span className="hidden text-sm font-semibold text-ink sm:inline" data-testid="topbar-profile-name">{me?.name ?? (authed ? "Memuat..." : "Tamu")}</span>
          {!authed && <Tag className="m-0 hidden rounded-full border-0 bg-butter sm:inline">Publik</Tag>}
        </button>
      </Dropdown>
    </header>
  );
}

export default function AppShell() {
  const [menu, setMenu] = useState(false);
  const { me, roles, role, isAdmin, isLoading } = useRole();
  if (!session.token() && !session.isGuest()) return <Navigate to="/login" replace />;
  const mode: Mode | "guest" = !isAuthed() ? "guest" : role;
  const ctx: ShellContext = { mode, roles, me, isAdmin, loading: isLoading };
  const nav = navFor(mode);
  return (
    <div className="min-h-screen bg-shell p-2 sm:p-4 lg:p-5">
      <div className="flex min-h-[calc(100vh-1rem)] gap-3 rounded-[32px] bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sm:min-h-[calc(100vh-2rem)] sm:p-3 lg:min-h-[calc(100vh-2.5rem)]">
        <Sidebar nav={nav} />
        <main className="relative z-0 min-w-0 flex-1 overflow-x-hidden rounded-[28px] bg-canvas p-4 sm:p-6 lg:p-8">
          <Topbar onMenu={() => setMenu(true)} ctx={ctx} nav={nav} />
          <Outlet context={ctx} />
        </main>
      </div>
      <Drawer open={menu} onClose={() => setMenu(false)} placement="left" size={288} title={<span className="flex items-center gap-3"><Logo /> PalembangPy</span>} data-testid="mobile-nav-drawer">
        <nav className="flex flex-col gap-1.5">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} onClick={() => setMenu(false)} data-testid={`mobile-${n.testid}`} className={({ isActive }) => cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors", isActive ? "bg-ink text-white" : "bg-white text-ink-2")}>
              <n.icon className="size-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
      </Drawer>
    </div>
  );
}
