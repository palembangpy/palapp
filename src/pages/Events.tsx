import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, DatePicker, Drawer, Dropdown, Form, Input, InputNumber, Modal, Segmented, Select, Switch } from "antd";
import { Award, CalendarDays, Clock, Download, MapPin, Mic2, MoreHorizontal, Pencil, Plus, QrCode, Search, Ticket, Trash2, UserPlus, Users } from "lucide-react";
import type { Dayjs } from "dayjs";
import { FormModal, full } from "@/components/FormModal";
import { Avatar, EmptyState, Locked, PageHeader, UserSelect } from "@/components/ui-kit";
import { clean, dayjs, downloadCsv, fmt, isUpcoming, relDay, rupiah } from "@/lib/format";
import { del, patch, post } from "@/lib/http";
import { useAction, useEvents, useRegistrations, useSpeakers, useUserEvents, useUsers, useRole } from "@/lib/queries";
import type { Certificate, CertificateGenerate, CommunityEvent, EventBase, Registration, User } from "@/lib/types";
import { cn } from "@/lib/utils";

type EventFormValues = Omit<EventBase, "start_time" | "end_time"> & { range?: [Dayjs | null, Dayjs | null] };
const ISO = "YYYY-MM-DDTHH:mm:ss";

const regUser = (r: Registration, users: User[]) => r.user ?? users.find((u) => u.id === r.user_id) ?? null;

function EventDetail({ e }: { e: CommunityEvent }) {
  const { isAdmin: authed, me } = useRole();
  const { data: regs = [], isLoading } = useRegistrations(authed ? e.id : null);
  const { data: myEvents = [] } = useUserEvents(!authed && me ? me.id : null);
  const joined = myEvents.some((x) => ((x.event_id as string) ?? x.event?.id ?? x.id) === e.id);
  const { data: users = [] } = useUsers();
  const { data: speakers = [] } = useSpeakers();
  const [addUser, setAddUser] = useState<string | undefined>();
  const [certUsers, setCertUsers] = useState<string[]>([]);
  const [certRole, setCertRole] = useState("participant");
  const [certs, setCerts] = useState<Certificate[]>([]);
  const register = useAction((user_id: string) => post(`/events/${e.id}/register`, { user_id }), authed ? "Member terdaftar di event" : "Kamu terdaftar di event! 🎉");
  const gencert = useAction((b: CertificateGenerate) => post<unknown>(`/events/${e.id}/gencert`, b), "Sertifikat dibuat");
  const evSpeakers = speakers.filter((s) => s.event_id === e.id);
  const regIds = regs.map((r) => r.user_id ?? r.user?.id).filter(Boolean) as string[];
  const regUsers = users.filter((u) => regIds.includes(u.id));

  return (
    <div className="space-y-5">
      <div className={cn("rounded-[20px] p-5", isUpcoming(e.start_time) ? "bg-pink" : "bg-lilac")}>
        <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold">{relDay(e.start_time)} · {e.is_paid ? rupiah(e.price) : "Gratis"}</span>
        <p className="mt-3 text-xl font-bold tracking-tight" data-testid="event-detail-title">{e.title}</p>
        {e.description && <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{e.description}</p>}
        <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-ink-2 sm:grid-cols-2">
          <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{fmt(e.start_time, "ddd, D MMM YYYY")}</span>
          <span className="flex items-center gap-1.5"><Clock className="size-3.5" />{fmt(e.start_time, "HH:mm")}{e.end_time ? ` – ${fmt(e.end_time, "HH:mm")}` : ""} WIB</span>
          <span className="flex items-center gap-1.5 sm:col-span-2"><MapPin className="size-3.5" />{e.location || "Lokasi menyusul"}</span>
        </div>
      </div>

      {evSpeakers.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Speaker</p>
          {evSpeakers.map((s) => (
            <div key={s.id} className="mb-2 flex items-center gap-3 rounded-xl bg-white p-2.5">
              <Avatar src={s.user?.avatar_url} name={s.user?.name ?? "Speaker"} className="size-9" />
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{s.user?.name}</p><p className="truncate text-xs text-ink-3">{s.topic}</p></div>
            </div>
          ))}
        </div>
      )}

      {authed && <div className="flex gap-2">
        <Link to={`/scan?event=${e.id}`} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white transition-transform hover:-translate-y-0.5" data-testid="event-detail-open-scanner"><QrCode className="size-4" /> Buka scanner presensi</Link>
        <Button shape="round" icon={<Download className="size-4" />} disabled={!regs.length} onClick={() => downloadCsv(`pendaftar-${e.title}.csv`, [["Kode", "Nama", "Waktu"], ...regs.map((r) => { const u = regUser(r, users); return [u?.member_code ?? "", u?.name ?? r.user_id ?? "", r.created_at ?? r.registered_at ?? ""]; })])} data-testid="event-detail-export">CSV</Button>
      </div>}

      {!authed ? (
        me ? (
          <div className="rounded-[20px] bg-mint p-4" data-testid="event-self-register-card">
            <p className="text-sm font-semibold">{joined ? "Kamu sudah terdaftar di event ini ✓" : "Ikut event ini?"}</p>
            <p className="mt-1 text-xs text-ink-2">{joined ? "Tunjukkan QR kartu member saat check-in di lokasi." : "Daftar sekarang, lalu tunjukkan QR kartu membermu saat datang."}</p>
            {!joined && isUpcoming(e.start_time) && (
              <Button type="primary" shape="round" className="mt-3" loading={register.isPending} onClick={() => register.mutate(me.id)} data-testid="event-self-register-button">Daftar event</Button>
            )}
          </div>
        ) : (
          <Locked what="pendaftar event" testId="event-detail-locked" />
        )
      ) : (
        <>
          <div className="bento !p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><UserPlus className="size-4" /> Daftarkan member</p>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1"><UserSelect users={users.filter((u) => !regIds.includes(u.id))} value={addUser} onChange={(v: string) => setAddUser(v)} testId="event-register-user-select" /></div>
              <Button type="primary" shape="round" disabled={!addUser} loading={register.isPending} onClick={() => addUser && register.mutate(addUser, { onSuccess: () => setAddUser(undefined) })} data-testid="event-register-submit">Daftar</Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Pendaftar ({regs.length})</p>
            {isLoading && <div className="h-20 animate-pulse rounded-xl bg-pill" />}
            {!isLoading && regs.length === 0 && <EmptyState title="Belum ada pendaftar" testId="event-detail-empty" />}
            <ul className="space-y-2" data-testid="event-detail-registrations">
              {regs.map((r, i) => {
                const u = regUser(r, users);
                return (
                  <li key={r.id ?? i} className="flex items-center gap-3 rounded-xl border border-black/[0.05] bg-white p-2.5">
                    <Avatar src={u?.avatar_url} name={u?.name ?? "Member"} className="size-9" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{u?.name ?? r.user_id}</p><p className="font-mono text-[11px] text-ink-3">{u?.member_code ?? "—"}</p></div>
                    <span className="text-[11px] text-ink-3">{fmt(r.created_at ?? r.registered_at, "D MMM HH:mm")}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-[20px] bg-butter p-4" data-testid="event-gencert-card">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Award className="size-4" /> Generate sertifikat</p>
            <UserSelect multiple users={regUsers.length ? regUsers : users} value={certUsers} onChange={(v: string[]) => setCertUsers(v)} testId="event-gencert-users" placeholder="Pilih penerima..." />
            <div className="mt-2 flex gap-2">
              <Select value={certRole} onChange={setCertRole} className="flex-1" data-testid="event-gencert-role" options={[{ value: "participant", label: "Peserta" }, { value: "speaker", label: "Speaker" }, { value: "committee", label: "Panitia" }]} />
              <Button type="primary" shape="round" disabled={!certUsers.length} loading={gencert.isPending} onClick={() => gencert.mutate({ user_ids: certUsers, role: certRole }, { onSuccess: (r) => { setCerts(Array.isArray(r) ? (r as Certificate[]) : []); setCertUsers([]); } })} data-testid="event-gencert-submit">Generate</Button>
            </div>
            {certs.length > 0 && (
              <ul className="mt-3 space-y-1.5" data-testid="event-gencert-results">
                {certs.map((c) => <li key={c.id}><Link to={`/verify?code=${c.code}`} className="flex justify-between rounded-xl bg-white/80 px-3 py-2 text-xs"><span>{c.recipient_name}</span><span className="font-mono">{c.code}</span></Link></li>)}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Events() {
  const { isAdmin: authed } = useRole();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { data: events = [], isLoading, isError } = useEvents(includeDeleted);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState("Mendatang");
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityEvent | null>(null);
  const [modal, ctx] = Modal.useModal();
  const save = useAction((b: EventBase) => (editing ? patch<CommunityEvent>(`/events/${editing.id}`, b) : post<CommunityEvent>("/events", b)), editing ? "Event diperbarui" : "Event dibuat");
  const remove = useAction(({ id, hard }: { id: string; hard: boolean }) => del(`/events/${id}/${hard ? "hard" : "soft"}`), "Event dihapus");
  const detail = events.find((e) => e.id === params.get("event")) ?? null;

  const sorted = [...events].sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
  const upcoming = sorted.filter((e) => isUpcoming(e.start_time));
  const past = sorted.filter((e) => !isUpcoming(e.start_time)).reverse();
  const next = upcoming[0];
  const filtered = useMemo(() => {
    const base = tab === "Mendatang" ? upcoming : tab === "Selesai" ? past : sorted;
    const k = q.trim().toLowerCase();
    return base.filter((e) => !k || `${e.title} ${e.location ?? ""} ${e.description ?? ""}`.toLowerCase().includes(k));
  }, [tab, upcoming, past, sorted, q]);

  const open = (e: CommunityEvent) => setParams((p) => { p.set("event", e.id); return p; });
  const edit = (e: CommunityEvent | null) => { setEditing(e); setFormOpen(true); };
  const confirmDelete = (e: CommunityEvent, hard: boolean) => modal.confirm({ title: `${hard ? "Hapus permanen" : "Arsipkan"} "${e.title}"?`, okText: hard ? "Hapus permanen" : "Arsipkan", okButtonProps: { danger: true }, onOk: () => remove.mutateAsync({ id: e.id, hard }) });

  return (
    <div data-testid="events-page">
      {ctx}
      <PageHeader
        eyebrow="Agenda komunitas"
        title="Event & Meetup"
        description={authed ? "Jadwalkan meetup & workshop, kelola pendaftar, presensi QR, dan generate sertifikat." : "Agenda meetup & workshop PalembangPy — daftar event dan bawa QR kartu membermu."}
        actions={authed ? <Button type="primary" shape="round" icon={<Plus className="size-4" />} onClick={() => edit(null)} data-testid="events-add-button">Buat Event</Button> : undefined}
      />

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="relative overflow-hidden rounded-[28px] bg-pink p-6 animate-fade-up sm:p-7 xl:col-span-8" data-testid="next-event-card">
          <div className="absolute -bottom-12 -right-12 size-48 rounded-full bg-white/30" aria-hidden />
          {next ? (
            <div className="relative flex flex-col gap-6 sm:flex-row">
              <div className="flex size-28 shrink-0 flex-col items-center justify-center rounded-[24px] bg-ink text-white">
                <span className="text-xs uppercase text-white/60">{fmt(next.start_time, "MMM")}</span>
                <span className="text-4xl font-bold leading-none">{fmt(next.start_time, "D")}</span>
                <span className="mt-1 text-[11px] text-butter">{fmt(next.start_time, "dddd")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="label-xs">Event berikutnya · {relDay(next.start_time)}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight" data-testid="next-event-title">{next.title}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
                  <span className="flex items-center gap-1.5"><Clock className="size-4" />{fmt(next.start_time, "HH:mm")} WIB</span>
                  <span className="flex items-center gap-1.5"><MapPin className="size-4" />{next.location || "Lokasi menyusul"}</span>
                  <span className="flex items-center gap-1.5"><Ticket className="size-4" />{next.is_paid ? rupiah(next.price) : "Gratis"}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {authed && <Link to={`/scan?event=${next.id}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5" data-testid="next-event-scan-button"><QrCode className="size-4" /> Buka presensi</Link>}
                  <Button shape="round" size="large" icon={<Users className="size-4" />} onClick={() => open(next)} data-testid="next-event-detail-button">{authed ? "Pendaftar" : "Detail & daftar"}</Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="relative text-sm text-ink-2">{isLoading ? "Memuat agenda..." : "Belum ada event mendatang."}</p>
          )}
        </section>
        <section className="grid grid-cols-3 gap-3 xl:col-span-4 xl:grid-cols-1">
          {[["Total event", events.length, "bg-white"], ["Mendatang", upcoming.length, "bg-mint"], ["Selesai", past.length, "bg-butter"]].map(([l, v, c], i) => (
            <div key={String(l)} className={cn("bento-hover animate-fade-up rounded-[20px] p-4", c as string)} style={{ animationDelay: `${i * 60}ms` }} data-testid={`events-stat-${i}`}>
              <p className="label-xs">{l}</p><p className="mt-1 text-2xl font-bold">{v}</p>
            </div>
          ))}
        </section>
      </div>

      <section className="bento animate-fade-up">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <Segmented shape="round" value={tab} onChange={(v) => setTab(String(v))} options={["Mendatang", "Selesai", "Semua"]} data-testid="events-tabs" />
          <Input allowClear size="large" prefix={<Search className="size-4 text-ink-3" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul, lokasi, deskripsi..." className="flex-1 rounded-full" data-testid="events-search-input" />
          {authed && <label className="flex items-center gap-2 text-xs font-semibold text-ink-2"><Switch size="small" checked={includeDeleted} onChange={setIncludeDeleted} data-testid="events-include-deleted" /> Termasuk arsip</label>}
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-52 animate-pulse rounded-[20px] bg-pill" />)}</div>
        ) : isError ? (
          <EmptyState title="Gagal memuat event" testId="events-error" />
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada event" hint="Coba tab lain atau buat event baru." testId="events-empty" />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3" data-testid="events-grid">
            {filtered.map((e, i) => {
              const up = isUpcoming(e.start_time);
              return (
                <article key={e.id} data-testid={`event-card-${e.id}`} className={cn("bento-hover animate-fade-up flex flex-col rounded-[20px] border border-black/[0.04] p-5", up ? "bg-pink" : "bg-canvas", e.deleted_at && "opacity-50")} style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex size-14 flex-col items-center justify-center rounded-2xl", up ? "bg-ink text-white" : "bg-white")}>
                        <span className={cn("text-[10px] uppercase", up ? "text-white/60" : "text-ink-3")}>{fmt(e.start_time, "MMM")}</span>
                        <span className="text-xl font-bold leading-none">{fmt(e.start_time, "D")}</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-ink-2">{relDay(e.start_time)}</p>
                        <p className="text-[11px] text-ink-3">{fmt(e.start_time, "HH:mm")} · {e.is_paid ? rupiah(e.price) : "Gratis"}{e.deleted_at ? " · arsip" : ""}</p>
                      </div>
                    </div>
                    {authed && (
                      <Dropdown trigger={["click"]} menu={{ items: [
                        { key: "d", icon: <Users className="size-4" />, label: "Detail & pendaftar", onClick: () => open(e) },
                        { key: "e", icon: <Pencil className="size-4" />, label: "Edit", onClick: () => edit(e) },
                        { key: "s", icon: <Trash2 className="size-4" />, label: "Arsipkan (soft)", danger: true, disabled: !!e.deleted_at, onClick: () => confirmDelete(e, false) },
                        { key: "h", icon: <Trash2 className="size-4" />, label: "Hapus permanen", danger: true, onClick: () => confirmDelete(e, true) },
                      ] }}>
                        <button className="flex size-8 items-center justify-center rounded-full bg-white/60 text-ink-2 hover:bg-white" aria-label="Aksi event" data-testid={`event-menu-${e.id}`}><MoreHorizontal className="size-4" /></button>
                      </Dropdown>
                    )}
                  </div>
                  <button onClick={() => open(e)} className="mt-4 text-left text-base font-semibold leading-snug hover:underline" data-testid={`event-card-title-${e.id}`}>{e.title}</button>
                  {e.description && <p className="mt-1 line-clamp-2 text-xs text-ink-2">{e.description}</p>}
                  <p className="mt-auto flex items-center gap-1.5 truncate pt-4 text-xs text-ink-2"><MapPin className="size-3.5" />{e.location || "Lokasi menyusul"}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Drawer open={!!detail} onClose={() => setParams((p) => { p.delete("event"); return p; })} size={480} title={<span className="flex items-center gap-2"><Mic2 className="size-4" /> Detail Event</span>} data-testid="event-detail-drawer">
        {detail && <EventDetail e={detail} />}
      </Drawer>

      <FormModal<EventFormValues>
        open={formOpen}
        onClose={() => setFormOpen(false)}
        testId="event-form-modal"
        title={editing ? "Edit Event" : "Buat Event Baru"}
        description="Meetup, workshop, atau ngopi bareng — siap untuk presensi QR & sertifikat."
        initialValues={editing ? { ...editing, range: [editing.start_time ? dayjs(editing.start_time) : null, editing.end_time ? dayjs(editing.end_time) : null] } : { is_paid: false, price: 0 }}
        pending={save.isPending}
        submitLabel={editing ? "Simpan event" : "Buat event"}
        onSubmit={({ range, ...v }) => save.mutate(clean({ ...v, price: v.is_paid ? v.price ?? 0 : 0, start_time: range?.[0]?.format(ISO) ?? null, end_time: range?.[1]?.format(ISO) ?? null }) as EventBase, { onSuccess: () => setFormOpen(false) })}
      >
        <Form.Item name="title" label="Judul event" className={full} rules={[{ required: true, min: 3, max: 200, message: "3–200 karakter" }]}><Input data-testid="event-form-title" /></Form.Item>
        <Form.Item name="range" label="Waktu mulai – selesai" className={full} rules={[{ required: true, message: "Tentukan waktu" }]}><DatePicker.RangePicker showTime={{ format: "HH:mm" }} format="D MMM YYYY HH:mm" allowEmpty={[false, true]} className="w-full" data-testid="event-form-range" /></Form.Item>
        <Form.Item name="location" label="Lokasi" className={full} rules={[{ max: 200 }]}><Input placeholder="Co-working / Google Meet" data-testid="event-form-location" /></Form.Item>
        <Form.Item name="is_paid" label="Berbayar" valuePropName="checked"><Switch data-testid="event-form-paid" /></Form.Item>
        <Form.Item noStyle shouldUpdate={(a, b) => a.is_paid !== b.is_paid}>
          {({ getFieldValue }) => <Form.Item name="price" label="Harga (Rp)"><InputNumber min={0} step={5000} disabled={!getFieldValue("is_paid")} className="w-full" data-testid="event-form-price" /></Form.Item>}
        </Form.Item>
        <Form.Item name="description" label="Deskripsi" className={full}><Input.TextArea rows={3} data-testid="event-form-description" /></Form.Item>
      </FormModal>
    </div>
  );
}
