import { useState } from "react";
import { Button, Dropdown, Form, Input, Modal, Select, Switch, Upload } from "antd";
import type { UploadFile } from "antd";
import { CalendarDays, FileUp, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { FormModal, full } from "@/components/FormModal";
import { Avatar, EmptyState, PageHeader, UserSelect } from "@/components/ui-kit";
import { fmt } from "@/lib/format";
import { del, http, patch, post } from "@/lib/http";
import { useAction, useEvents, useSpeakers, useUsers, useRole } from "@/lib/queries";
import type { Speaker, SpeakerBase } from "@/lib/types";
import { cn } from "@/lib/utils";

type MaterialForm = { title: string; description?: string; file: UploadFile[] };

export default function Speakers() {
  const { isAdmin: authed } = useRole();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { data: speakers = [], isLoading } = useSpeakers(includeDeleted);
  const { data: events = [] } = useEvents();
  const { data: users = [] } = useUsers();
  const [q, setQ] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Speaker | null>(null);
  const [material, setMaterial] = useState<Speaker | null>(null);
  const [modal, ctx] = Modal.useModal();

  const save = useAction((b: SpeakerBase) => (editing ? patch(`/speakers/${editing.id}`, { topic: b.topic, bio: b.bio }) : post("/speakers", b)), editing ? "Speaker diperbarui" : "Speaker didaftarkan");
  const remove = useAction(({ id, hard }: { id: string; hard: boolean }) => del(`/speakers/${id}/${hard ? "hard" : "soft"}`), "Speaker dihapus");
  const upload = useAction(({ id, v }: { id: string; v: MaterialForm }) => {
    const fd = new FormData();
    fd.append("title", v.title);
    if (v.description) fd.append("description", v.description);
    fd.append("file", v.file[0].originFileObj as File);
    return http.post(`/speakers/${id}/materials`, fd).then((r) => r.data);
  }, "Materi berhasil diunggah");

  const k = q.trim().toLowerCase();
  const filtered = speakers.filter((s) => (eventFilter === "all" || s.event_id === eventFilter) && (!k || `${s.user?.name ?? ""} ${s.topic ?? ""} ${s.event?.title ?? ""}`.toLowerCase().includes(k)));
  const evTitle = (id: string) => events.find((e) => e.id === id)?.title;
  const confirmDelete = (s: Speaker, hard: boolean) => modal.confirm({ title: `${hard ? "Hapus permanen" : "Nonaktifkan"} speaker ${s.user?.name ?? ""}?`, okText: "Hapus", okButtonProps: { danger: true }, onOk: () => remove.mutateAsync({ id: s.id, hard }) });

  return (
    <div data-testid="speakers-page">
      {ctx}
      <PageHeader
        eyebrow="Pembicara komunitas"
        title="Speaker"
        description="Para Wong Kito yang berbagi ilmu di setiap event — lengkap dengan topik & materi."
        actions={authed ? <Button type="primary" shape="round" icon={<Plus className="size-4" />} onClick={() => { setEditing(null); setFormOpen(true); }} data-testid="speakers-add-button">Tambah Speaker</Button> : undefined}
      />

      <section className="bento mb-5 animate-fade-up">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input allowClear size="large" prefix={<Search className="size-4 text-ink-3" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama speaker, topik, event..." className="flex-1 rounded-full" data-testid="speakers-search-input" />
          <Select size="large" value={eventFilter} onChange={setEventFilter} className="md:w-64" data-testid="speakers-event-filter" options={[{ value: "all", label: "Semua event" }, ...events.map((e) => ({ value: e.id, label: e.title }))]} />
          {authed && <label className="flex items-center gap-2 text-xs font-semibold text-ink-2"><Switch size="small" checked={includeDeleted} onChange={setIncludeDeleted} data-testid="speakers-include-deleted" /> Termasuk terhapus</label>}
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-56 animate-pulse rounded-[24px] bg-white" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Belum ada speaker" hint="Tambahkan speaker untuk event berikutnya." testId="speakers-empty" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="speakers-grid">
          {filtered.map((s, i) => (
            <article key={s.id} data-testid={`speaker-card-${s.id}`} style={{ animationDelay: `${Math.min(i, 9) * 50}ms` }} className={cn("bento-hover animate-fade-up relative overflow-hidden rounded-[24px] border border-black/[0.04] p-5", i % 3 === 0 ? "bg-butter" : i % 3 === 1 ? "bg-white" : "bg-mint", s.deleted_at && "opacity-50")}>
              <div className="flex items-start justify-between gap-3">
                <Avatar src={s.user?.avatar_url} name={s.user?.name ?? "Speaker"} className="size-16 ring-4 ring-white" />
                {authed && (
                  <Dropdown trigger={["click"]} menu={{ items: [
                    { key: "m", icon: <FileUp className="size-4" />, label: "Upload materi", onClick: () => setMaterial(s) },
                    { key: "e", icon: <Pencil className="size-4" />, label: "Edit topik & bio", onClick: () => { setEditing(s); setFormOpen(true); } },
                    { key: "s", icon: <Trash2 className="size-4" />, label: "Nonaktifkan (soft)", danger: true, onClick: () => confirmDelete(s, false) },
                    { key: "h", icon: <Trash2 className="size-4" />, label: "Hapus permanen", danger: true, onClick: () => confirmDelete(s, true) },
                  ] }}>
                    <button className="flex size-8 items-center justify-center rounded-full bg-white/60 hover:bg-white" aria-label="Aksi speaker" data-testid={`speaker-menu-${s.id}`}><MoreHorizontal className="size-4" /></button>
                  </Dropdown>
                )}
              </div>
              <p className="mt-4 text-lg font-semibold tracking-tight" data-testid={`speaker-name-${s.id}`}>{s.user?.name ?? "Speaker"}</p>
              <p className="font-mono text-[11px] text-ink-3">{s.user?.member_code}</p>
              <p className="mt-3 text-[15px] font-semibold leading-snug">“{s.topic || "Topik menyusul"}”</p>
              {s.bio && <p className="mt-1 line-clamp-3 text-sm text-ink-2">{s.bio}</p>}
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs text-ink-2">
                <CalendarDays className="size-3.5 shrink-0" /><span className="truncate">{s.event?.title ?? evTitle(s.event_id) ?? "Event"}</span><span className="ml-auto shrink-0">{fmt(s.event?.start_time, "D MMM")}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <FormModal<SpeakerBase>
        open={formOpen}
        onClose={() => setFormOpen(false)}
        testId="speaker-form-modal"
        title={editing ? "Edit Speaker" : "Tambah Speaker"}
        initialValues={editing ?? undefined}
        pending={save.isPending}
        onSubmit={(v) => save.mutate(v, { onSuccess: () => setFormOpen(false) })}
      >
        {!editing && (
          <>
            <Form.Item name="user_id" label="Member" rules={[{ required: true, message: "Pilih member" }]}><UserSelect users={users} testId="speaker-form-user" /></Form.Item>
            <Form.Item name="event_id" label="Event" rules={[{ required: true, message: "Pilih event" }]}><Select showSearch={{ optionFilterProp: "label" }} data-testid="speaker-form-event" options={events.map((e) => ({ value: e.id, label: e.title }))} /></Form.Item>
          </>
        )}
        <Form.Item name="topic" label="Topik" className={full} rules={[{ max: 200 }]}><Input data-testid="speaker-form-topic" /></Form.Item>
        <Form.Item name="bio" label="Bio speaker" className={full}><Input.TextArea rows={3} data-testid="speaker-form-bio" /></Form.Item>
      </FormModal>

      <FormModal<MaterialForm>
        open={!!material}
        onClose={() => setMaterial(null)}
        testId="material-form-modal"
        title="Upload Materi"
        description={material ? `Materi untuk ${material.user?.name ?? "speaker"} — ${material.topic ?? ""}` : undefined}
        pending={upload.isPending}
        submitLabel="Upload"
        onSubmit={(v) => material && upload.mutate({ id: material.id, v }, { onSuccess: () => setMaterial(null) })}
      >
        <Form.Item name="title" label="Judul materi" className={full} rules={[{ required: true }]}><Input data-testid="material-form-title" /></Form.Item>
        <Form.Item name="description" label="Deskripsi" className={full}><Input.TextArea rows={2} data-testid="material-form-description" /></Form.Item>
        <Form.Item name="file" label="File (PDF / PPT / ZIP)" className={full} valuePropName="fileList" getValueFromEvent={(e: { fileList: UploadFile[] }) => e.fileList.slice(-1)} rules={[{ required: true, message: "Pilih file" }]}>
          <Upload.Dragger beforeUpload={() => false} maxCount={1} data-testid="material-form-file">
            <p className="py-2 text-sm text-ink-2"><FileUp className="mx-auto mb-2 size-6" />Klik atau seret file ke sini</p>
          </Upload.Dragger>
        </Form.Item>
      </FormModal>
    </div>
  );
}
