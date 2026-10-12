import { useState } from "react";
import { Button, Dropdown, Form, Input, Modal, Segmented, Switch } from "antd";
import { ExternalLink, Handshake, Mail, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { FormModal, full } from "@/components/FormModal";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { clean } from "@/lib/format";
import { del, patch, post } from "@/lib/http";
import { useAction, usePartners, useRole } from "@/lib/queries";
import type { Partner, PartnerBase } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONES = ["bg-white", "bg-mint", "bg-pink", "bg-butter", "bg-lilac"];

export default function Partners() {
  const { isAdmin: authed } = useRole();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { data: partners = [], isLoading } = usePartners(includeDeleted);
  const [q, setQ] = useState("");
  const [type, setType] = useState("Semua");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [modal, ctx] = Modal.useModal();
  const save = useAction((b: PartnerBase) => (editing ? patch(`/partners/${editing.id}`, b) : post("/partners", b)), editing ? "Partner diperbarui" : "Partner ditambahkan");
  const remove = useAction(({ id, hard }: { id: string; hard: boolean }) => del(`/partners/${id}/${hard ? "hard" : "soft"}`), "Partner dihapus");

  const types = ["Semua", ...new Set(partners.map((p) => p.type).filter(Boolean) as string[])];
  const k = q.trim().toLowerCase();
  const filtered = partners.filter((p) => (type === "Semua" || p.type === type) && (!k || `${p.name} ${p.description ?? ""} ${p.type ?? ""}`.toLowerCase().includes(k)));
  const confirmDelete = (p: Partner, hard: boolean) => modal.confirm({ title: `${hard ? "Hapus permanen" : "Nonaktifkan"} ${p.name}?`, okText: "Hapus", okButtonProps: { danger: true }, onOk: () => remove.mutateAsync({ id: p.id, hard }) });

  return (
    <div data-testid="partners-page">
      {ctx}
      <PageHeader
        eyebrow="Kolaborasi"
        title="Partner & Sponsor"
        description="Komunitas, perusahaan, dan institusi yang mendukung perjalanan PalembangPy."
        actions={authed ? <Button type="primary" shape="round" icon={<Plus className="size-4" />} onClick={() => { setEditing(null); setFormOpen(true); }} data-testid="partners-add-button">Tambah Partner</Button> : undefined}
      />

      <section className="bento mb-5 animate-fade-up">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input allowClear size="large" prefix={<Search className="size-4 text-ink-3" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari partner..." className="flex-1 rounded-full" data-testid="partners-search-input" />
          <div className="overflow-x-auto"><Segmented shape="round" value={type} onChange={(v) => setType(String(v))} options={types} data-testid="partners-type-filter" /></div>
          {authed && <label className="flex items-center gap-2 text-xs font-semibold text-ink-2"><Switch size="small" checked={includeDeleted} onChange={setIncludeDeleted} data-testid="partners-include-deleted" /> Termasuk terhapus</label>}
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-56 animate-pulse rounded-[24px] bg-white" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Belum ada partner" testId="partners-empty" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="partners-grid">
          {filtered.map((p, i) => (
            <article key={p.id} data-testid={`partner-card-${p.id}`} style={{ animationDelay: `${Math.min(i, 9) * 50}ms` }} className={cn("bento-hover animate-fade-up flex flex-col rounded-[24px] border border-black/[0.04] p-5", TONES[i % TONES.length], i === 0 && "md:col-span-2 xl:col-span-1", p.deleted_at && "opacity-50")}>
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm">{p.logo_url ? <img src={p.logo_url} alt={p.name} className="max-h-full max-w-full object-contain" /> : <Handshake className="size-6" />}</span>
                {authed && (
                  <Dropdown trigger={["click"]} menu={{ items: [
                    { key: "e", icon: <Pencil className="size-4" />, label: "Edit", onClick: () => { setEditing(p); setFormOpen(true); } },
                    { key: "s", icon: <Trash2 className="size-4" />, label: "Nonaktifkan (soft)", danger: true, onClick: () => confirmDelete(p, false) },
                    { key: "h", icon: <Trash2 className="size-4" />, label: "Hapus permanen", danger: true, onClick: () => confirmDelete(p, true) },
                  ] }}>
                    <button className="flex size-8 items-center justify-center rounded-full bg-white/60 hover:bg-white" aria-label="Aksi partner" data-testid={`partner-menu-${p.id}`}><MoreHorizontal className="size-4" /></button>
                  </Dropdown>
                )}
              </div>
              <p className="mt-4 text-lg font-semibold tracking-tight" data-testid={`partner-name-${p.id}`}>{p.name}</p>
              {p.type && <span className="mt-1 w-fit rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-white">{p.type}</span>}
              {p.description && <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-ink-2">{p.description}</p>}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {p.contact && <a href={p.contact.includes("@") ? `mailto:${p.contact}` : undefined} className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold" data-testid={`partner-contact-${p.id}`}><Mail className="size-3.5" />{p.contact}</a>}
                {p.website_url && <a href={p.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5" data-testid={`partner-website-${p.id}`}><ExternalLink className="size-3.5" />Website</a>}
              </div>
            </article>
          ))}
        </div>
      )}

      <FormModal<PartnerBase>
        open={formOpen}
        onClose={() => setFormOpen(false)}
        testId="partner-form-modal"
        title={editing ? "Edit Partner" : "Tambah Partner"}
        initialValues={editing ?? undefined}
        pending={save.isPending}
        onSubmit={(v) => save.mutate(clean({ ...v }) as PartnerBase, { onSuccess: () => setFormOpen(false) })}
      >
        <Form.Item name="name" label="Nama partner" rules={[{ required: true, min: 2, max: 100 }]}><Input data-testid="partner-form-name" /></Form.Item>
        <Form.Item name="type" label="Jenis" rules={[{ max: 50 }]}><Input placeholder="Community Support / Sponsor" data-testid="partner-form-type" /></Form.Item>
        <Form.Item name="contact" label="Kontak" rules={[{ max: 100 }]}><Input data-testid="partner-form-contact" /></Form.Item>
        <Form.Item name="website_url" label="Website" rules={[{ max: 255 }]}><Input placeholder="https://..." data-testid="partner-form-website" /></Form.Item>
        <Form.Item name="logo_url" label="URL logo" className={full} rules={[{ max: 255 }]}><Input placeholder="https://..." data-testid="partner-form-logo" /></Form.Item>
        <Form.Item name="description" label="Deskripsi" className={full}><Input.TextArea rows={3} data-testid="partner-form-description" /></Form.Item>
      </FormModal>
    </div>
  );
}
