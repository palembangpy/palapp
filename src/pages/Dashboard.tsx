import { Link, useNavigate } from "react-router-dom";
import { Dropdown, Table, Tag } from "antd";
import { ArrowRight, ArrowUpRight, BadgeCheck, CalendarDays, Code2, Handshake, MapPin, Mic2, MoreHorizontal, QrCode, Trophy, Users } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MemberCard, MemberCardSkeleton } from "@/components/MemberCard";
import { MiniCalendar } from "@/components/MiniCalendar";
import { Avatar, EmptyState, Locked, ProgressBar, StatTile } from "@/components/ui-kit";
import { ROLE_STYLE, dayjs, fmt, isUpcoming, relDay, roleOf, rupiah } from "@/lib/format";
import { isAuthed, useEvents, useMe, usePartners, useSpeakers, useStats, useUsers } from "@/lib/queries";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const BAR = ["#101828", "#A99BF2", "#F7A8C9", "#F5CF4B"];

export default function Dashboard() {
  const navigate = useNavigate();
  const authed = isAuthed();
  const { data: stats, isError: statsErr } = useStats();
  const { data: events = [] } = useEvents();
  const { data: speakers = [] } = useSpeakers();
  const { data: partners = [] } = usePartners();
  const { data: me } = useMe();
  const { data: users = [], isLoading: usersLoading } = useUsers();

  const s = statsErr ? undefined : stats;
  const memberCount = s?.members ?? (users.length || undefined);
  const upcoming = events.filter((e) => isUpcoming(e.start_time)).sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
  const next = upcoming[0];
  const recentUsers = [...users].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
  const leaders = [...users].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, 5);
  const featured: User | undefined = me ?? leaders[0] ?? speakers.find((sp) => sp.user)?.user ?? undefined;
  const composition = [
    { name: "Admin", v: s?.admins ?? users.filter((u) => u.is_admin).length },
    { name: "Staff", v: s?.staffs ?? users.filter((u) => u.is_staff && !u.is_admin).length },
    { name: "Speaker", v: s?.speakers ?? speakers.length },
    { name: "Partner", v: s?.partners ?? partners.length },
  ];
  const greet = me?.name?.split(" ")[0] ?? (authed ? "Admin" : "Wong Kito");

  return (
    <div className="space-y-5" data-testid="dashboard-page">
      <h1 className="text-2xl font-bold tracking-tight text-ink animate-fade-up sm:text-[32px]" data-testid="page-title">Dashboard</h1>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <section className="relative overflow-hidden rounded-[28px] bg-mint p-6 animate-fade-up sm:p-8" data-testid="welcome-banner">
            <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/30" aria-hidden />
            <div className="absolute bottom-[-60px] right-40 size-40 rounded-full bg-lilac/50" aria-hidden />
            <div className="relative z-10 max-w-[60%] max-sm:max-w-full">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-ink-2">
                <span className="size-1.5 rounded-full bg-[#12B76A]" /> Komunitas Python Palembang · #WongKitoDev
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-[40px] sm:leading-[1.05]" data-testid="welcome-title">
                Halo {greet}! <span className="inline-block animate-float">🐍</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-2 sm:text-[15px]" data-testid="welcome-description">
                {memberCount !== undefined && <>PalembangPy punya <b className="text-ink">{memberCount} member</b>. </>}
                {next ? (
                  <>Event terdekat <b className="text-ink">“{next.title}”</b> {relDay(next.start_time).toLowerCase()}{next.location ? ` di ${next.location}` : ""}.</>
                ) : (
                  "Belum ada event mendatang — yuk jadwalkan meetup baru!"
                )}
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link to="/scan" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5" data-testid="welcome-scan-button"><QrCode className="size-4" /> Scan Presensi</Link>
                <Link to="/events" className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 bg-white/70 px-5 text-sm font-semibold text-ink transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-white" data-testid="welcome-events-button"><CalendarDays className="size-4" /> Kelola Event</Link>
              </div>
            </div>
            <img src="/hero-dev.jpg" alt="Developer PalembangPy" className="pointer-events-none absolute -bottom-6 right-2 hidden w-[300px] [mask-image:radial-gradient(closest-side,#000_72%,transparent)] animate-float sm:block lg:w-[330px]" />
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="stats-ribbon">
            <StatTile testId="stat-members" label="Member" value={memberCount ?? "—"} hint={s ? `${s.admins} admin · ${s.staffs} staff` : "Total terdaftar"} icon={<Users className="size-4" />} />
            <StatTile testId="stat-events" tone="pink" label="Event" value={s?.events ?? events.length} hint={`${upcoming.length} mendatang`} icon={<CalendarDays className="size-4" />} delay={60} />
            <StatTile testId="stat-speakers" tone="butter" label="Speaker" value={s?.speakers ?? speakers.length} hint="Berbagi ilmu" icon={<Mic2 className="size-4" />} delay={120} />
            <StatTile testId="stat-projects" tone="lilac" label="Project" value={s?.projects ?? "—"} hint={`${s?.partners ?? partners.length} partner`} icon={<Code2 className="size-4" />} delay={180} />
          </section>

          <section className="bento animate-fade-up" data-testid="recent-members-section">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-ink">Member Terbaru</h3>
                <p className="text-xs text-ink-3">Pendaftar terbaru komunitas PalembangPy</p>
              </div>
              <Link to="/members" className="rounded-full bg-butter px-4 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-[#FFE07A]" data-testid="recent-members-view-all">Lihat semua</Link>
            </div>
            {!authed ? (
              <Locked what="data member" testId="recent-members-locked" />
            ) : (
              <Table<User>
                rowKey="id"
                loading={usersLoading}
                dataSource={recentUsers}
                pagination={false}
                size="middle"
                locale={{ emptyText: <EmptyState title="Belum ada member" /> }}
                onRow={(u) => ({ onClick: () => navigate(`/members?member=${u.id}`), className: "cursor-pointer", "data-testid": `recent-member-row-${u.id}` } as React.HTMLAttributes<HTMLElement>)}
                columns={[
                  { title: "Nama", key: "name", render: (_, u) => <div className="flex items-center gap-3"><Avatar src={u.avatar_url} name={u.name} /><div><p className="font-medium">{u.name}</p><p className="font-mono text-[11px] text-ink-3">{u.member_code}</p></div></div> },
                  { title: "Peran", key: "role", responsive: ["md"], render: (_, u) => <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", ROLE_STYLE[roleOf(u)])}>{roleOf(u)}</span> },
                  { title: "Status", key: "status", responsive: ["sm"], render: (_, u) => <span className="inline-flex items-center gap-1.5 text-ink-2"><span className={cn("size-1.5 rounded-full", u.deleted_at ? "bg-[#98A2B3]" : "bg-[#12B76A]")} />{u.deleted_at ? "Nonaktif" : `${u.points ?? 0} poin`}</span> },
                  { title: "Bergabung", key: "joined", responsive: ["lg"], render: (_, u) => <span className="text-ink-3">{fmt(u.created_at)}</span> },
                  {
                    key: "act", width: 48,
                    render: (_, u) => (
                      <span onClick={(e) => e.stopPropagation()}>
                        <Dropdown trigger={["click"]} menu={{ items: [{ key: "v", label: "Lihat kartu member", onClick: () => navigate(`/members?member=${u.id}`) }] }}>
                          <button className="flex size-8 items-center justify-center rounded-full text-ink-3 hover:bg-pill" aria-label="Aksi" data-testid={`recent-member-menu-${u.id}`}><MoreHorizontal className="size-4" /></button>
                        </Dropdown>
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <div className="bento animate-fade-up lg:col-span-3" data-testid="composition-chart">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-tight">Ekosistem Komunitas</h3>
                <span className="label-xs">dari /stats</span>
              </div>
              <div className="h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={composition} margin={{ left: -24, right: 8, top: 10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "#F6F6F5" }} contentStyle={{ borderRadius: 14, fontSize: 12 }} formatter={(value: number) => [value, "Jumlah"]} />
                    <Bar dataKey="v" radius={[10, 10, 4, 4]} maxBarSize={42}>{composition.map((c, i) => <Cell key={c.name} fill={BAR[i]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-[24px] bg-ink p-5 text-white animate-fade-up lg:col-span-2" data-testid="points-leaderboard">
              <p className="flex items-center gap-2 text-lg font-semibold"><Trophy className="size-5 text-butter" /> Top Poin</p>
              <p className="mb-4 text-xs text-white/50">Member paling aktif</p>
              {!authed ? (
                <p className="text-sm text-white/60">Masuk sebagai admin untuk melihat leaderboard.</p>
              ) : leaders.length === 0 ? (
                <p className="text-sm text-white/60">Belum ada data.</p>
              ) : (
                <ol className="space-y-3">
                  {leaders.map((u, i) => (
                    <li key={u.id} className="flex items-center gap-3">
                      <span className={cn("flex size-6 items-center justify-center rounded-full text-[11px] font-bold", i === 0 ? "bg-butter text-ink" : "bg-white/10")}>{i + 1}</span>
                      <Avatar src={u.avatar_url} name={u.name} className="size-8" />
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{u.name}</p>
                      <span className="text-xs font-semibold text-butter">{u.points ?? 0}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <section className="bento animate-fade-up" data-testid="partners-strip">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Handshake className="size-5" /> Partner & Pendukung</h3>
              <Link to="/partners" className="flex items-center gap-1 text-sm font-semibold text-ink transition-[gap] hover:gap-2" data-testid="partners-strip-link">Semua <ArrowRight className="size-4" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {partners.slice(0, 4).map((p, i) => (
                <a key={p.id} href={p.website_url ?? "#"} target="_blank" rel="noreferrer" data-testid={`partner-chip-${p.id}`} className={cn("bento-hover flex flex-col items-center gap-2 rounded-2xl p-4 text-center", ["bg-canvas", "bg-mint/60", "bg-pink/60", "bg-butter/60"][i % 4])}>
                  <span className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">{p.logo_url ? <img src={p.logo_url} alt={p.name} className="max-h-full max-w-full object-contain" /> : <Handshake className="size-5" />}</span>
                  <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                  <p className="line-clamp-1 text-[11px] text-ink-3">{p.type}</p>
                </a>
              ))}
              {partners.length === 0 && <p className="col-span-full text-sm text-ink-3">Belum ada partner.</p>}
            </div>
          </section>
        </div>

        <div className="space-y-5 xl:col-span-4">
          <MiniCalendar events={events} />
          {featured ? <MemberCard member={featured} testId="featured-member-card" onOpenProfile={authed ? () => navigate(`/members?member=${featured.id}`) : undefined} /> : <MemberCardSkeleton />}

          <section className="rounded-[24px] bg-pink p-5 animate-fade-up" data-testid="upcoming-events">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">Event Mendatang</h3>
              <Link to="/events" className="flex size-8 items-center justify-center rounded-full bg-white/70 transition-transform hover:rotate-45" data-testid="upcoming-events-link" aria-label="Semua event"><ArrowUpRight className="size-4" /></Link>
            </div>
            <div className="space-y-2.5">
              {upcoming.length === 0 && <p className="text-sm text-ink-2">Belum ada event terjadwal.</p>}
              {upcoming.slice(0, 4).map((e) => (
                <Link key={e.id} to={`/events?event=${e.id}`} data-testid={`upcoming-event-${e.id}`} className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white">
                  <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-ink text-white">
                    <span className="text-[10px] uppercase leading-none text-white/60">{fmt(e.start_time, "MMM")}</span>
                    <span className="text-lg font-bold leading-tight">{fmt(e.start_time, "D")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.title}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-ink-3"><MapPin className="size-3" /> {e.location || "Lokasi menyusul"} · {rupiah(e.price)}</p>
                  </div>
                  <Tag className="m-0 shrink-0 rounded-full border-0 bg-pink text-[10px] font-semibold">{relDay(e.start_time)}</Tag>
                </Link>
              ))}
            </div>
          </section>

          <section className="bento animate-fade-up" data-testid="speakers-spotlight">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight"><Mic2 className="size-5" /> Speaker Spotlight</h3>
            <div className="space-y-2">
              {speakers.slice(0, 3).map((sp) => (
                <div key={sp.id} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                  <Avatar src={sp.user?.avatar_url} name={sp.user?.name ?? "Speaker"} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{sp.user?.name ?? "Speaker"}</p>
                    <p className="truncate text-xs text-ink-3">{sp.topic ?? sp.event?.title}</p>
                  </div>
                </div>
              ))}
              {speakers.length === 0 && <p className="text-sm text-ink-3">Belum ada speaker.</p>}
            </div>
            <div className="mt-4 rounded-2xl bg-lilac p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><BadgeCheck className="size-4" /> Cek keaslian sertifikat</p>
              <Link to="/verify" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-2 hover:text-ink" data-testid="dashboard-verify-link">Verifikasi sekarang <ArrowRight className="size-3" /></Link>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[24px] bg-ink p-5 text-white animate-fade-up" data-testid="invite-card">
            <img src="/community.jpg" alt="Komunitas PalembangPy" className="mb-4 h-36 w-full rounded-2xl object-cover" />
            <p className="text-xl font-semibold leading-snug">Ajak teman jadi Wong Kito Dev!</p>
            <p className="mt-1 text-sm text-white/60">Daftarkan member baru & bagikan kartu QR mereka. {dayjs().format("YYYY")}</p>
            <ProgressBar value={memberCount ?? 0} max={100} tone="bg-butter" />
            <p className="mt-1 text-[11px] text-white/50">Target 100 member: {memberCount ?? 0}/100</p>
            <Link to="/members?new=1" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-butter transition-[gap] hover:gap-3" data-testid="invite-add-member-link">Tambah member <ArrowRight className="size-4" /></Link>
          </section>
        </div>
      </div>
    </div>
  );
}
