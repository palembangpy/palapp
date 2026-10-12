import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Select } from "antd";
import { Lock } from "lucide-react";
import QRCode from "qrcode";
import { initialsOf } from "@/components/ui-kit-helpers";
import { tintFor } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

export function Avatar({ src, name, className, testId }: { src?: string | null; name: string; className?: string; testId?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span data-testid={testId} className={cn("relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-ink", tintFor(name), className)}>
      {src && !failed ? <img src={src} alt={name} className="size-full object-cover" onError={() => setFailed(true)} loading="lazy" /> : initialsOf(name)}
    </span>
  );
}

export function QrCode({ value, size = 160, testId }: { value: string; size?: number; testId?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) QRCode.toCanvas(ref.current, value, { width: size, margin: 1, color: { dark: "#101828", light: "#ffffff" } }).catch(() => {});
  }, [value, size]);
  return <canvas ref={ref} data-testid={testId} style={{ width: size, height: size }} aria-label={`QR ${value}`} />;
}

export async function downloadQr(value: string, filename: string) {
  const url = await QRCode.toDataURL(value, { width: 720, margin: 2, color: { dark: "#101828", light: "#ffffff" } });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 animate-fade-up sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="label-xs mb-1.5">{eyebrow}</p>}
        <h1 data-testid="page-title" className="text-2xl font-bold tracking-tight text-ink sm:text-[32px] sm:leading-tight">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type Tone = "white" | "mint" | "pink" | "butter" | "lilac" | "ink";
const TONES: Record<Tone, string> = { white: "bg-white", mint: "bg-mint", pink: "bg-pink", butter: "bg-butter", lilac: "bg-lilac", ink: "bg-ink text-white" };

export function StatTile({ label, value, hint, tone = "white", icon, testId, delay = 0 }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone; icon?: ReactNode; testId?: string; delay?: number }) {
  const dark = tone === "ink";
  return (
    <div data-testid={testId} style={{ animationDelay: `${delay}ms` }} className={cn("bento-hover animate-fade-up relative overflow-hidden rounded-[20px] border border-black/[0.04] p-4 sm:p-5", TONES[tone])}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-[11px] font-semibold uppercase tracking-[0.12em]", dark ? "text-white/60" : "text-ink-3")}>{label}</p>
        {icon && <span className={cn("flex size-8 items-center justify-center rounded-xl", dark ? "bg-white/10" : "bg-white/70")}>{icon}</span>}
      </div>
      <p className={cn("mt-3 text-2xl font-bold tracking-tight", dark ? "text-white" : "text-ink")} data-testid={testId ? `${testId}-value` : undefined}>{value}</p>
      {hint && <p className={cn("mt-1 text-xs", dark ? "text-white/60" : "text-ink-2")}>{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, hint, testId, action }: { title: string; hint?: string; testId?: string; action?: ReactNode }) {
  return (
    <div data-testid={testId} className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-black/10 bg-white/60 px-6 py-10 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-mint text-xl">🐍</span>
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-ink-3">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Locked({ what = "data ini", testId = "locked-card", adminOnly = false }: { what?: string; testId?: string; adminOnly?: boolean }) {
  if (adminOnly)
    return (
      <div data-testid={testId} className="flex flex-col items-center justify-center rounded-[20px] bg-butter/70 px-6 py-10 text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-ink text-butter"><Lock className="size-5" /></span>
        <p className="font-semibold text-ink">Khusus admin & staff</p>
        <p className="mt-1 max-w-xs text-sm text-ink-2">Akun kamu tidak punya akses ke {what}. Gunakan dashboard Member / Speaker.</p>
        <Link to="/" className="mt-4 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white" data-testid={`${testId}-home-link`}>Ke dashboard saya</Link>
      </div>
    );
  return (
    <div data-testid={testId} className="flex flex-col items-center justify-center rounded-[20px] bg-lilac/60 px-6 py-10 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-ink text-butter"><Lock className="size-5" /></span>
      <p className="font-semibold text-ink">Login admin diperlukan</p>
      <p className="mt-1 max-w-xs text-sm text-ink-2">API PalembangPy membatasi akses {what} hanya untuk admin.</p>
      <Link to="/login" className="mt-4 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5" data-testid={`${testId}-login-link`}>Masuk admin</Link>
    </div>
  );
}

export function ProgressBar({ value, max, tone = "bg-ink", testId }: { value: number; max: number; tone?: string; testId?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div data-testid={testId} className="h-2 w-full overflow-hidden rounded-full bg-black/[0.07]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%`, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
    </div>
  );
}

export function UserSelect({ users, value, onChange, testId, multiple, placeholder = "Pilih member..." }: { users: User[]; value?: string | string[]; onChange?: (v: never) => void; testId: string; multiple?: boolean; placeholder?: string }) {
  return (
    <Select<string | string[]>
      showSearch={{ optionFilterProp: "label" }}
      mode={multiple ? "multiple" : undefined}
      value={value}
      onChange={(v) => onChange?.(v as never)}
      placeholder={placeholder}
      data-testid={testId}
      options={users.map((u) => ({ value: u.id, label: `${u.name} · ${u.member_code}` }))}
      className="w-full"
    />
  );
}
