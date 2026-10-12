import { useState } from "react";
import { Dropdown } from "antd";
import { CreditCard, Download, Github, Globe, Instagram, Linkedin, MoreHorizontal, QrCode as QrIcon, Send, UserRound } from "lucide-react";
import { IdCardModal } from "@/components/IdCardModal";
import { Avatar, QrCode, downloadQr } from "@/components/ui-kit";
import { ROLE_STYLE, fmt, roleOf } from "@/lib/format";
import { notify } from "@/lib/notify";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const ensureUrl = (u: string) => (/^https?:\/\//.test(u) ? u : `https://${u}`);

/** FoxHR-style profile card + PalembangPy ID strip with QR of member_code. */
export function MemberCard({ member, onOpenProfile, testId = "member-card", extra }: { member: User; onOpenProfile?: () => void; testId?: string; extra?: { label: string; value: string }[] }) {
  const [showQr, setShowQr] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const role = roleOf(member);
  const dl = () => downloadQr(member.member_code, `${member.member_code}-${member.name.replace(/\s+/g, "_")}.png`).then(() => notify.success(`QR ${member.member_code} diunduh`));
  const socials = [
    { id: "telegram", icon: Send, href: member.username ? `https://t.me/${member.username}` : null },
    { id: "github", icon: Github, href: member.github_url },
    { id: "instagram", icon: Instagram, href: member.instagram_url },
    { id: "linkedin", icon: Linkedin, href: member.linkedin_url },
    { id: "website", icon: Globe, href: member.website_url },
  ].filter((s) => s.href);

  const rows = [
    ["Username", member.username ? `@${member.username}` : "—"],
    ["Bergabung", fmt(member.created_at, "DD/MM/YYYY")],
    ["Poin", `${member.points ?? 0} poin`],
    ["Telegram ID", member.telegram_id ?? "—"],
    ...(extra ?? []).map((e) => [e.label, e.value]),
  ];

  return (
    <div data-testid={testId} className="bento bento-hover animate-fade-up relative overflow-hidden">
      <div className="flex items-start gap-4">
        <div className="relative">
          <Avatar src={member.avatar_url} name={member.name} className="size-16 ring-4 ring-mint" />
          <span className={cn("absolute -bottom-0.5 -right-0.5 size-4 rounded-full ring-2 ring-white", member.deleted_at ? "bg-[#98A2B3]" : "bg-[#12B76A]")} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold tracking-tight text-ink" data-testid={`${testId}-name`}>{member.name}</p>
          <p className="line-clamp-1 text-sm text-ink-3">{member.bio || "Pythonista Wong Kito"}</p>
          <span className={cn("mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold", ROLE_STYLE[role])}>{role}{member.deleted_at ? " · nonaktif" : ""}</span>
        </div>
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              ...(onOpenProfile ? [{ key: "p", icon: <UserRound className="size-4" />, label: "Lihat profil lengkap", onClick: onOpenProfile }] : []),
              { key: "c", icon: <CreditCard className="size-4" />, label: "Kartu ID (PNG / PDF / cetak)", onClick: () => setCardOpen(true) },
              { key: "d", icon: <Download className="size-4" />, label: "Download QR ID", onClick: dl },
            ],
          }}
        >
          <button className="flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-pill hover:text-ink" data-testid={`${testId}-menu-button`} aria-label="Opsi member">
            <MoreHorizontal className="size-5" />
          </button>
        </Dropdown>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {socials.length === 0 && <span className="self-center text-xs text-ink-3">Belum ada tautan sosial</span>}
        {socials.map((s) => (
          <a key={s.id} href={ensureUrl(s.href!)} target="_blank" rel="noreferrer" aria-label={s.id} data-testid={`${testId}-${s.id}-link`} className="flex size-11 items-center justify-center rounded-full bg-canvas text-ink shadow-[0_6px_14px_-8px_rgba(16,24,40,0.4)] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-mint active:scale-95">
            <s.icon className="size-[18px]" />
          </a>
        ))}
        <button onClick={() => setCardOpen(true)} aria-label="Cetak kartu ID" data-testid={`${testId}-print-card`} className="ml-auto flex h-11 items-center gap-2 rounded-full bg-lilac px-4 text-xs font-semibold text-ink transition-colors duration-200 hover:bg-[#CABEFF]">
          <CreditCard className="size-4" /> Kartu
        </button>
        <button onClick={() => setShowQr((v) => !v)} data-testid={`${testId}-toggle-qr`} className={cn(" flex h-11 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors duration-200", showQr ? "bg-ink text-white" : "bg-butter text-ink hover:bg-[#FFE07A]")}>
          <QrIcon className="size-4" /> QR ID
        </button>
      </div>

      <dl className="mt-5 space-y-3 border-t border-black/[0.06] pt-5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <dt className="font-semibold text-ink">{k}</dt>
            <dd className="truncate text-right text-ink-3" data-testid={`${testId}-${k.toLowerCase().replace(/\s+/g, "-")}`}>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex items-center gap-4 rounded-[18px] bg-ink p-3 pr-4 text-white">
        <div className={cn("overflow-hidden rounded-xl bg-white p-1 transition-[width,height] duration-300", showQr ? "size-[104px]" : "size-14")}>
          <QrCode value={member.member_code} size={showQr ? 96 : 48} testId={`${testId}-qr`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">PalembangPy Member ID</p>
          <p className="truncate font-mono text-base font-bold tracking-wider text-butter sm:text-lg" data-testid={`${testId}-code`}>{member.member_code}</p>
          <p className="truncate text-[11px] text-white/60">{role} · {member.points ?? 0} poin</p>
        </div>
        {showQr && (
          <button onClick={dl} className="flex size-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20" aria-label="Download QR" data-testid={`${testId}-strip-download`}>
            <Download className="size-4" />
          </button>
        )}
      </div>
      <IdCardModal user={cardOpen ? member : null} onClose={() => setCardOpen(false)} />
    </div>
  );
}

export function MemberCardSkeleton() {
  return (
    <div className="bento space-y-4" data-testid="member-card-skeleton">
      <div className="flex gap-4">
        <div className="size-16 animate-pulse rounded-full bg-pill" />
        <div className="flex-1 space-y-2 pt-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-pill" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-pill" />
        </div>
      </div>
      <div className="h-24 animate-pulse rounded-2xl bg-pill" />
    </div>
  );
}
