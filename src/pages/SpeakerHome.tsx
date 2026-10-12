import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "antd";
import { CalendarDays, Clock, FileUp, MapPin, Mic2, Pencil, QrCode, Users } from "lucide-react";
import { useShell } from "@/components/AppShell";
import { MemberCard, MemberCardSkeleton } from "@/components/MemberCard";
import { MiniCalendar } from "@/components/MiniCalendar";
import { MaterialUploadModal, SessionEditModal } from "@/components/SpeakerModals";
import { EmptyState, StatTile } from "@/components/ui-kit";
import { dayjs, fmt, isUpcoming, relDay } from "@/lib/format";
import { useRegistrations, useSpeakers, useUserCertificates } from "@/lib/queries";
import type { CommunityEvent, Speaker } from "@/lib/types";
import { cn } from "@/lib/utils";

function AttendeeCount({ eventId }: { eventId: string }) {
  const { data, isError } = useRegistrations(eventId);
  return <span data-testid={`session-attendees-${eventId}`}>{isError ? "—" : (data?.length ?? "…")}</span>;
}

export default function SpeakerHome() {
  const { me } = useShell();
  const { data: speakers = [], isLoading } = useSpeakers();
  const { data: certs = [] } = useUserCertificates(me?.id ?? null);
  const [material, setMaterial] = useState<Speaker | null>(null);
  const [editing, setEditing] = useState<Speaker | null>(null);

  const sessions = speakers.filter((s) => s.user_id === me?.id && !s.deleted_at).sort((a, b) => (a.event?.start_time ?? "").localeCompare(b.event?.start_time ?? ""));
  const upcoming = sessions.filter((s) => isUpcoming(s.event?.start_time));
  const next = upcoming[0];
  const speakerCerts = certs.filter((c) => c.role.toLowerCase().includes("speak") || c.speaker_id);
  const evs = sessions.map((s) => s.event).filter(Boolean) as CommunityEvent[];
  const hoursLeft = next?.event?.start_time ? dayjs(next.event.start_time).diff(dayjs(), "hour") : null;

  return (
    <div className="space-y-5" data-testid="speaker-home-page">
      <h1 className="text-2xl font-bold tracking-tight animate-fade-up sm:text-[32px]" data-testid="page-title">Dashboard Speaker</h1>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <section className="relative overflow-hidden rounded-[28px] bg-butter p-6 animate-fade-up sm:p-8" data-testid="speaker-next-session">
            <div className="absolute -right-14 -top-14 size-56 rounded-full bg-white/35" aria-hidden />
            <p className="label-xs relative">Sesi berikutnya</p>
            {next ? (
              <div className="relative mt-3 flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex size-28 shrink-0 flex-col items-center justify-center rounded-[24px] bg-ink text-white">
                  <span className="text-xs uppercase text-white/60">{fmt(next.event?.start_time, "MMM")}</span>
                  <span className="text-4xl font-bold leading-none">{fmt(next.event?.start_time, "D")}</span>
                  <span className="mt-1 text-[11px] text-butter">{relDay(next.event?.start_time)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="speaker-next-topic">“{next.topic || "Topik menyusul"}”</p>
                  <p className="mt-1 text-sm text-ink-2">{next.event?.title}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
                    <span className="flex items-center gap-1.5"><Clock className="size-4" />{fmt(next.event?.start_time, "HH:mm")} WIB</span>
                    <span className="flex items-center gap-1.5"><MapPin className="size-4" />{next.event?.location || "Lokasi menyusul"}</span>
                    {hoursLeft !== null && hoursLeft >= 0 && <span className="rounded-full bg-white/70 px-2.5 text-xs font-semibold leading-6">{hoursLeft < 48 ? `${hoursLeft} jam lagi` : `${Math.round(hoursLeft / 24)} hari lagi`}</span>}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="primary" shape="round" size="large" icon={<FileUp className="size-4" />} onClick={() => setMaterial(next)} data-testid="speaker-next-upload">Upload materi</Button>
                    <Button shape="round" size="large" icon={<Pencil className="size-4" />} onClick={() => setEditing(next)} data-testid="speaker-next-edit">Edit sesi</Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="relative mt-2 text-sm text-ink-2" data-testid="speaker-no-next">{isLoading ? "Memuat sesi..." : "Belum ada sesi mendatang. Hubungi admin untuk dijadwalkan."}</p>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile testId="speaker-stat-total" tone="ink" label="Total sesi" value={sessions.length} hint="Sepanjang waktu" icon={<Mic2 className="size-4 text-butter" />} />
            <StatTile testId="speaker-stat-upcoming" tone="pink" label="Mendatang" value={upcoming.length} hint="Siapkan materi" delay={60} />
            <StatTile testId="speaker-stat-done" tone="mint" label="Selesai" value={sessions.length - upcoming.length} hint="Terima kasih!" delay={120} />
            <StatTile testId="speaker-stat-certs" tone="lilac" label="Sertifikat speaker" value={speakerCerts.length} hint="Terbit" delay={180} />
          </section>

          <section className="bento animate-fade-up" data-testid="speaker-sessions">
            <h3 className="mb-4 text-lg font-semibold tracking-tight">Sesi Saya</h3>
            {isLoading ? <div className="h-32 animate-pulse rounded-2xl bg-pill" /> : sessions.length === 0 ? <EmptyState title="Belum ada sesi" testId="speaker-sessions-empty" /> : (
              <div className="space-y-3">
                {sessions.map((s) => {
                  const up = isUpcoming(s.event?.start_time);
                  return (
                    <article key={s.id} className={cn("flex flex-col gap-4 rounded-[20px] p-4 sm:flex-row sm:items-center", up ? "bg-pink" : "bg-canvas")} data-testid={`speaker-session-${s.id}`}>
                      <div className={cn("flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl", up ? "bg-ink text-white" : "bg-white")}>
                        <span className="text-[10px] uppercase opacity-60">{fmt(s.event?.start_time, "MMM")}</span><span className="text-xl font-bold leading-none">{fmt(s.event?.start_time, "D")}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug">{s.topic || "Topik menyusul"}</p>
                        <p className="text-xs text-ink-2">{s.event?.title} · {relDay(s.event?.start_time)}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3"><Users className="size-3.5" /> Pendaftar: <AttendeeCount eventId={s.event_id} /></p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button shape="round" size="small" icon={<FileUp className="size-3.5" />} onClick={() => setMaterial(s)} data-testid={`speaker-session-upload-${s.id}`}>Materi</Button>
                        <Button shape="round" size="small" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(s)} data-testid={`speaker-session-edit-${s.id}`}>Edit</Button>
                        <Link to={`/events?event=${s.event_id}`} className="flex h-6 items-center gap-1 rounded-full bg-ink px-3 text-xs font-semibold text-white" data-testid={`speaker-session-event-${s.id}`}><CalendarDays className="size-3.5" /> Event</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5 xl:col-span-4">
          {me ? <MemberCard member={me} testId="speaker-self-card" extra={[{ label: "Sesi", value: `${sessions.length} sesi` }]} /> : <MemberCardSkeleton />}
          <MiniCalendar events={evs} />
          <section className="rounded-[24px] bg-lilac p-5 animate-fade-up" data-testid="speaker-tips">
            <p className="flex items-center gap-2 font-semibold"><QrCode className="size-4" /> Checklist speaker</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink-2">
              <li>Upload slide minimal H-1 sebelum sesi</li>
              <li>Sertakan repo/demo di deskripsi materi</li>
              <li>Peserta presensi via QR kartu member</li>
            </ul>
          </section>
        </div>
      </div>
      <MaterialUploadModal speaker={material} onClose={() => setMaterial(null)} />
      <SessionEditModal speaker={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
