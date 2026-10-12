import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Form, Input, Tag } from "antd";
import { ArrowRight, Award, CalendarCheck, CalendarDays, Code2, CreditCard, Github, MapPin, Pencil, Plus, Sparkles, Trophy } from "lucide-react";
import { useShell } from "@/components/AppShell";
import { FormModal, full } from "@/components/FormModal";
import { IdCardModal } from "@/components/IdCardModal";
import { MemberCard, MemberCardSkeleton } from "@/components/MemberCard";
import { MiniCalendar } from "@/components/MiniCalendar";
import { EmptyState, StatTile } from "@/components/ui-kit";
import { clean, fmt, isUpcoming, relDay, rupiah, splitTags } from "@/lib/format";
import { API_ORIGIN, patch, post } from "@/lib/http";
import { useAction, useEvents, useProjects, useUserCertificates, useUserEvents } from "@/lib/queries";
import type { ProjectBase, UserUpdate } from "@/lib/types";
import { cn } from "@/lib/utils";

const fileUrl = (p: string) => (/^https?:\/\//.test(p) ? p : `${API_ORIGIN}/${p.replace(/^\/+/, "")}`);
const SOCIAL = ["github_url", "instagram_url", "linkedin_url", "website_url"] as const;

export default function MemberHome() {
  const { me } = useShell();
  const { data: events = [] } = useEvents();
  const { data: myEvents = [], isLoading: evLoading } = useUserEvents(me?.id ?? null);
  const { data: certs = [], isLoading: certLoading } = useUserCertificates(me?.id ?? null);
  const { data: projects = [] } = useProjects();
  const [cardOpen, setCardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const register = useAction((eventId: string) => post(`/events/${eventId}/register`, { user_id: me!.id }), "Kamu terdaftar di event! 🎉");
  const saveProfile = useAction((v: UserUpdate) => patch(`/users/${me!.id}`, v), "Profil diperbarui");
  const submitProject = useAction((v: ProjectBase) => post("/projects", v), "Project masuk showcase!");

  const joinedIds = new Set(myEvents.map((e) => (e.event_id as string) ?? e.event?.id ?? e.id));
  const upcoming = events.filter((e) => isUpcoming(e.start_time) && !e.deleted_at).sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
  const mine = projects.filter((p) => p.user_id === me?.id);
  const myCalendar = events.filter((e) => joinedIds.has(e.id));

  return (
    <div className="space-y-5" data-testid="member-home-page">
      <h1 className="text-2xl font-bold tracking-tight animate-fade-up sm:text-[32px]" data-testid="page-title">Dashboard Member</h1>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <section className="relative overflow-hidden rounded-[28px] bg-mint p-6 animate-fade-up sm:p-8" data-testid="member-welcome-banner">
            <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/30" aria-hidden />
            <div className="relative z-10 max-w-[62%] max-sm:max-w-full">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 font-mono text-[11px] font-semibold text-ink-2" data-testid="member-welcome-code">{me?.member_code ?? "PALPY…"}</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-[40px] sm:leading-[1.05]">Halo {me?.name.split(" ")[0] ?? "Wong Kito"}! <span className="inline-block animate-float">🐍</span></h2>
              <p className="mt-3 text-sm text-ink-2 sm:text-[15px]">
                Kamu punya <b className="text-ink">{me?.points ?? 0} poin</b>, sudah ikut <b className="text-ink">{myEvents.length} event</b> dan mengantongi <b className="text-ink">{certs.length} sertifikat</b>.
                {upcoming[0] && <> Jangan lewatkan “{upcoming[0].title}” {relDay(upcoming[0].start_time).toLowerCase()}!</>}
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Button type="primary" shape="round" size="large" icon={<CreditCard className="size-4" />} disabled={!me} onClick={() => setCardOpen(true)} data-testid="member-open-idcard">Kartu ID saya</Button>
                <Button shape="round" size="large" icon={<Pencil className="size-4" />} disabled={!me} onClick={() => setEditOpen(true)} data-testid="member-edit-profile">Edit profil</Button>
              </div>
            </div>
            <img src="/hero-dev.jpg" alt="" className="pointer-events-none absolute -bottom-6 right-2 hidden w-[280px] animate-float [mask-image:radial-gradient(closest-side,#000_72%,transparent)] sm:block" />
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile testId="member-stat-points" tone="ink" label="Poin" value={me?.points ?? 0} hint="Keaktifan komunitas" icon={<Trophy className="size-4 text-butter" />} />
            <StatTile testId="member-stat-events" tone="pink" label="Event diikuti" value={myEvents.length} hint={`${upcoming.filter((e) => joinedIds.has(e.id)).length} akan datang`} icon={<CalendarCheck className="size-4" />} delay={60} />
            <StatTile testId="member-stat-certs" tone="butter" label="Sertifikat" value={certs.length} hint="Terverifikasi" icon={<Award className="size-4" />} delay={120} />
            <StatTile testId="member-stat-projects" tone="lilac" label="Project" value={mine.length} hint="Di showcase" icon={<Code2 className="size-4" />} delay={180} />
          </section>

          <section className="bento animate-fade-up" data-testid="member-upcoming-events">
            <div className="mb-4 flex items-center justify-between">
              <div><h3 className="text-lg font-semibold tracking-tight">Daftar Event</h3><p className="text-xs text-ink-3">Ikuti event berikutnya, sekali klik</p></div>
              <Link to="/events" className="flex items-center gap-1 text-sm font-semibold transition-[gap] hover:gap-2" data-testid="member-events-link">Semua <ArrowRight className="size-4" /></Link>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState title="Belum ada event mendatang" testId="member-upcoming-empty" />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {upcoming.map((e) => {
                  const joined = joinedIds.has(e.id);
                  return (
                    <div key={e.id} className={cn("flex flex-col rounded-[20px] p-4", joined ? "bg-mint" : "bg-pink")} data-testid={`member-event-${e.id}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-ink text-white"><span className="text-[10px] uppercase text-white/60">{fmt(e.start_time, "MMM")}</span><span className="text-lg font-bold leading-tight">{fmt(e.start_time, "D")}</span></div>
                        <div className="min-w-0"><p className="font-semibold leading-snug">{e.title}</p><p className="flex items-center gap-1 text-xs text-ink-2"><MapPin className="size-3" />{e.location || "Lokasi menyusul"} · {fmt(e.start_time, "HH:mm")}</p></div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <Tag className="m-0 rounded-full border-0 bg-white/70">{e.is_paid ? rupiah(e.price) : "Gratis"} · {relDay(e.start_time)}</Tag>
                        {joined ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-[#05603A]" data-testid={`member-event-joined-${e.id}`}><CalendarCheck className="size-4" /> Terdaftar</span>
                        ) : (
                          <Button type="primary" shape="round" size="small" loading={register.isPending && register.variables === e.id} onClick={() => register.mutate(e.id)} data-testid={`member-event-register-${e.id}`}>Daftar</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="bento animate-fade-up" data-testid="member-history">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight"><CalendarDays className="size-5" /> Riwayat Event</h3>
              {evLoading ? <div className="h-24 animate-pulse rounded-2xl bg-pill" /> : myEvents.length === 0 ? <p className="text-sm text-ink-3">Belum mengikuti event.</p> : (
                <ul className="space-y-2">
                  {myEvents.map((e, i) => (
                    <li key={(e.id as string) ?? i} className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5">
                      <span className="truncate text-sm font-medium">{(e.title as string) ?? e.event?.title ?? "Event"}</span>
                      <span className="shrink-0 text-[11px] text-ink-3">{fmt((e.start_time as string) ?? e.event?.start_time ?? e.created_at, "D MMM YY")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-[24px] bg-butter p-5 animate-fade-up sm:p-6" data-testid="member-certificates">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight"><Award className="size-5" /> Sertifikat Saya</h3>
              {certLoading ? <div className="h-24 animate-pulse rounded-2xl bg-white/50" /> : certs.length === 0 ? <p className="text-sm text-ink-2">Ikuti event untuk mendapatkan sertifikat.</p> : (
                <ul className="space-y-2">
                  {certs.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2.5" data-testid={`member-cert-${c.code}`}>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{c.event_name}</p><p className="font-mono text-[11px] text-ink-2">{c.code} · <span className="capitalize">{c.role}</span></p></div>
                      <Link to={`/verify?code=${c.code}`} className="text-xs font-semibold underline-offset-4 hover:underline">Cek</Link>
                      {c.file_path && <a href={fileUrl(c.file_path)} target="_blank" rel="noreferrer" className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">Unduh</a>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="bento animate-fade-up" data-testid="member-projects">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Code2 className="size-5" /> Project Saya</h3>
              <Button shape="round" icon={<Plus className="size-4" />} disabled={!me} onClick={() => setProjectOpen(true)} data-testid="member-add-project">Submit project</Button>
            </div>
            {mine.length === 0 ? <EmptyState title="Belum ada project" hint="Pamerkan karya Python-mu ke komunitas." testId="member-projects-empty" /> : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {mine.map((p) => (
                  <div key={p.id} className={cn("rounded-[20px] p-4", p.is_featured ? "bg-lilac" : "bg-canvas")} data-testid={`member-project-${p.id}`}>
                    <p className="flex items-center gap-2 font-mono font-bold">{p.title}{p.is_featured && <Sparkles className="size-3.5" />}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-2">{p.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      {splitTags(p.tags).map((t) => <span key={t} className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px]">{t}</span>)}
                      {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" className="ml-auto flex size-7 items-center justify-center rounded-full bg-ink text-white" aria-label="GitHub"><Github className="size-3.5" /></a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5 xl:col-span-4">
          {me ? <MemberCard member={me} testId="member-self-card" /> : <MemberCardSkeleton />}
          <MiniCalendar events={myCalendar.length ? myCalendar : events} />
          <section className="relative overflow-hidden rounded-[24px] bg-ink p-5 text-white animate-fade-up" data-testid="member-cta-card">
            <img src="/community.jpg" alt="" className="mb-4 h-32 w-full rounded-2xl object-cover" />
            <p className="text-lg font-semibold">Mau jadi speaker?</p>
            <p className="mt-1 text-sm text-white/60">Hubungi admin lewat bot Telegram PalembangPy untuk mengajukan topik.</p>
          </section>
        </div>
      </div>

      <IdCardModal user={cardOpen ? me ?? null : null} onClose={() => setCardOpen(false)} />
      <FormModal<UserUpdate>
        open={editOpen}
        onClose={() => setEditOpen(false)}
        testId="profile-form-modal"
        title="Edit Profil"
        initialValues={me}
        pending={saveProfile.isPending}
        onSubmit={(v) => saveProfile.mutate(clean({ ...v }) as UserUpdate, { onSuccess: () => setEditOpen(false) })}
      >
        <Form.Item name="name" label="Nama" rules={[{ required: true, min: 2 }]}><Input data-testid="profile-form-name" /></Form.Item>
        <Form.Item name="username" label="Username"><Input prefix="@" data-testid="profile-form-username" /></Form.Item>
        <Form.Item name="avatar_url" label="URL foto" className={full}><Input data-testid="profile-form-avatar" /></Form.Item>
        <Form.Item name="bio" label="Bio" className={full} rules={[{ max: 500 }]}><Input.TextArea rows={2} showCount maxLength={500} data-testid="profile-form-bio" /></Form.Item>
        {SOCIAL.map((k) => <Form.Item key={k} name={k} label={k.replace("_url", "").replace(/^\w/, (c) => c.toUpperCase())}><Input placeholder="https://..." data-testid={`profile-form-${k}`} /></Form.Item>)}
      </FormModal>
      <FormModal<ProjectBase>
        open={projectOpen}
        onClose={() => setProjectOpen(false)}
        testId="member-project-modal"
        title="Submit Project"
        initialValues={{ status: "active", is_featured: false }}
        pending={submitProject.isPending}
        onSubmit={(v) => submitProject.mutate(clean({ ...v, user_id: me!.id }) as ProjectBase, { onSuccess: () => setProjectOpen(false) })}
      >
        <Form.Item name="title" label="Judul" className={full} rules={[{ required: true }]}><Input data-testid="member-project-title" /></Form.Item>
        <Form.Item name="description" label="Deskripsi" className={full}><Input.TextArea rows={3} data-testid="member-project-description" /></Form.Item>
        <Form.Item name="tags" label="Tag (koma)" className={full}><Input placeholder="Python, FastAPI" data-testid="member-project-tags" /></Form.Item>
        <Form.Item name="github_url" label="GitHub"><Input data-testid="member-project-github" /></Form.Item>
        <Form.Item name="demo_url" label="Demo"><Input data-testid="member-project-demo" /></Form.Item>
      </FormModal>
    </div>
  );
}
