import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Drawer, Dropdown, Form, Input, InputNumber, Modal, Segmented, Switch, Table, Tooltip, Typography } from "antd";
import { CreditCard, Download, Eye, LayoutGrid, List, MoreHorizontal, Pencil, Plus, QrCode, Search, Trash2, UserX } from "lucide-react";
import { FormModal, full } from "@/components/FormModal";
import { IdCardModal } from "@/components/IdCardModal";
import { MemberCard } from "@/components/MemberCard";
import { Avatar, EmptyState, Locked, PageHeader, QrCode as Qr, StatTile, downloadQr } from "@/components/ui-kit";
import { ROLE_STYLE, clean, downloadCsv, fmt, roleOf } from "@/lib/format";
import { del, patch, post } from "@/lib/http";
import { notify } from "@/lib/notify";
import { isAuthed, useAction, useUserCertificates, useUserEvents, useUsers, useRole } from "@/lib/queries";
import type { User, UserCreate, UserCreateResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

function MemberDetail({ member }: { member: User }) {
  const { data: certs, isLoading: cl } = useUserCertificates(member.id);
  const { data: evs, isLoading: el } = useUserEvents(member.id);
  return (
    <div className="space-y-5">
      <MemberCard member={member} testId="member-detail-card" />
      <div className="rounded-[20px] bg-mint p-5 text-center">
        <p className="label-xs mb-3">QR presensi · {member.member_code}</p>
        <div className="mx-auto inline-block rounded-2xl bg-white p-3"><Qr value={member.member_code} size={180} testId="member-detail-qr" /></div>
        <Button type="primary" shape="round" block className="mt-4" icon={<Download className="size-4" />} onClick={() => downloadQr(member.member_code, `${member.member_code}.png`).then(() => notify.success("QR diunduh"))} data-testid="member-detail-download-qr">Download QR (PNG)</Button>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Event diikuti ({evs?.length ?? 0})</p>
        <div className="space-y-2" data-testid="member-detail-events">
          {el && <div className="h-12 animate-pulse rounded-xl bg-pill" />}
          {evs?.length === 0 && <p className="text-sm text-ink-3">Belum mengikuti event.</p>}
          {evs?.map((e, i) => (
            <div key={(e.id as string) ?? i} className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.05] bg-white px-3 py-2.5">
              <p className="truncate text-sm">{e.title ?? e.event?.title ?? "Event"}</p>
              <span className="shrink-0 text-[11px] text-ink-3">{fmt((e.start_time as string) ?? e.event?.start_time ?? e.created_at, "D MMM YY")}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Sertifikat ({certs?.length ?? 0})</p>
        <div className="space-y-2" data-testid="member-detail-certificates">
          {cl && <div className="h-12 animate-pulse rounded-xl bg-pill" />}
          {certs?.length === 0 && <p className="text-sm text-ink-3">Belum ada sertifikat.</p>}
          {certs?.map((c) => (
            <a key={c.id} href={`/verify?code=${c.code}`} className="flex items-center justify-between gap-3 rounded-xl bg-butter/70 px-3 py-2.5 transition-colors hover:bg-butter">
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{c.event_name}</span><span className="font-mono text-[11px] text-ink-2">{c.code}</span></span>
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold capitalize">{c.role}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

const SOCIAL = ["github_url", "instagram_url", "linkedin_url", "twitter_url", "website_url"] as const;

export default function Members() {
  const { isAdmin: authed } = useRole();
  const [params, setParams] = useSearchParams();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { data: users = [], isLoading, isError } = useUsers(includeDeleted);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [role, setRole] = useState("Semua");
  const [view, setView] = useState<"table" | "grid">("table");
  const [formOpen, setFormOpen] = useState(params.get("new") === "1" && authed);
  const [editing, setEditing] = useState<User | null>(null);
  const [created, setCreated] = useState<UserCreateResponse | null>(null);
  const [cardUser, setCardUser] = useState<User | null>(null);
  const [modal, ctx] = Modal.useModal();

  const save = useAction(
    (v: UserCreate) => (editing ? patch<User>(`/users/${editing.id}`, v) : post<UserCreateResponse>("/users", v)),
    editing ? "Data member diperbarui" : "Member berhasil didaftarkan",
  );
  const remove = useAction(({ id, hard }: { id: string; hard: boolean }) => del(`/users/${id}/${hard ? "hard" : "soft"}`), "Member dihapus");

  const detail = users.find((u) => u.id === params.get("member")) ?? null;
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users.filter((u) => (role === "Semua" || roleOf(u) === role) && (!s || [u.name, u.member_code, u.username ?? "", u.telegram_id ?? ""].some((x) => x.toLowerCase().includes(s))));
  }, [users, q, role]);

  const openDetail = (u: User) => setParams((p) => { p.set("member", u.id); return p; });
  const closeDetail = () => setParams((p) => { p.delete("member"); return p; });
  const openEdit = (u: User | null) => { setEditing(u); setFormOpen(true); };
  const confirmDelete = (u: User, hard: boolean) =>
    modal.confirm({
      title: hard ? `Hapus permanen ${u.name}?` : `Nonaktifkan ${u.name}?`,
      content: hard ? "Data akan dihapus selamanya dari database PalembangPy." : "Soft delete — data masih bisa dilihat dengan filter 'termasuk terhapus'.",
      okText: hard ? "Hapus permanen" : "Nonaktifkan",
      okButtonProps: { danger: true },
      onOk: () => remove.mutateAsync({ id: u.id, hard }),
    });

  const menu = (u: User) => ({
    items: [
      { key: "v", icon: <Eye className="size-4" />, label: "Lihat kartu member", onClick: () => openDetail(u) },
      { key: "c", icon: <CreditCard className="size-4" />, label: "Kartu ID (PNG / PDF)", onClick: () => setCardUser(u) },
      { key: "q", icon: <QrCode className="size-4" />, label: "Download QR", onClick: () => downloadQr(u.member_code, `${u.member_code}.png`) },
      { key: "e", icon: <Pencil className="size-4" />, label: "Edit data", onClick: () => openEdit(u) },
      { type: "divider" as const },
      { key: "s", icon: <UserX className="size-4" />, label: "Nonaktifkan (soft)", danger: true, disabled: !!u.deleted_at, onClick: () => confirmDelete(u, false) },
      { key: "h", icon: <Trash2 className="size-4" />, label: "Hapus permanen", danger: true, onClick: () => confirmDelete(u, true) },
    ],
  });
  const RowMenu = (u: User) => (
    <span onClick={(e) => e.stopPropagation()}>
      <Dropdown trigger={["click"]} menu={menu(u)}>
        <button className="flex size-8 items-center justify-center rounded-full text-ink-3 hover:bg-pill hover:text-ink" aria-label="Aksi member" data-testid={`member-row-menu-${u.member_code}`}><MoreHorizontal className="size-4" /></button>
      </Dropdown>
    </span>
  );

  const counts = { total: users.filter((u) => !u.deleted_at).length, admin: users.filter((u) => u.is_admin).length, staff: users.filter((u) => u.is_staff).length, points: users.reduce((a, u) => a + (u.points ?? 0), 0) };
  const exportCsv = () => downloadCsv("member-palembangpy.csv", [["Kode", "Nama", "Username", "Telegram ID", "Peran", "Poin", "Bergabung"], ...filtered.map((u) => [u.member_code, u.name, u.username ?? "", u.telegram_id ?? "", roleOf(u), u.points ?? 0, u.created_at])]);

  return (
    <div data-testid="members-page">
      {ctx}
      <PageHeader
        eyebrow="Direktori komunitas"
        title="Member PalembangPy"
        description="Kelola data Wong Kito Dev, kartu member & QR presensi, sertifikat, dan riwayat event."
        actions={
          <>
            <Button shape="round" icon={<Download className="size-4" />} onClick={exportCsv} disabled={!authed} data-testid="members-export-button">Export CSV</Button>
            <Tooltip title={authed ? "" : "Login admin diperlukan"}>
              <Button type="primary" shape="round" icon={<Plus className="size-4" />} onClick={() => openEdit(null)} disabled={!authed} data-testid="members-add-button">Tambah Member</Button>
            </Tooltip>
          </>
        }
      />

      {!authed ? (
        <Locked what="data member" testId="members-locked" adminOnly={isAuthed()} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile testId="members-stat-total" tone="ink" label="Member aktif" value={counts.total} hint="Memiliki kode PALPY" />
            <StatTile testId="members-stat-admin" tone="mint" label="Admin" value={counts.admin} hint="Pengelola dashboard" delay={60} />
            <StatTile testId="members-stat-staff" tone="pink" label="Staff" value={counts.staff} hint="Panitia & core team" delay={120} />
            <StatTile testId="members-stat-points" tone="butter" label="Total poin" value={counts.points} hint="Akumulasi keaktifan" delay={180} />
          </div>

          <section className="bento animate-fade-up">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <Input allowClear size="large" prefix={<Search className="size-4 text-ink-3" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, kode member, username, Telegram ID..." className="flex-1 rounded-full" data-testid="members-search-input" />
              <div className="flex flex-wrap items-center gap-3">
                <Segmented shape="round" value={role} onChange={(v) => setRole(String(v))} options={["Semua", "Admin", "Staff", "Member"]} data-testid="members-role-filter" />
                <label className="flex items-center gap-2 text-xs font-semibold text-ink-2"><Switch size="small" checked={includeDeleted} onChange={setIncludeDeleted} data-testid="members-include-deleted" /> Termasuk terhapus</label>
                <Segmented shape="round" value={view} onChange={(v) => setView(v as "table" | "grid")} options={[{ value: "table", icon: <List className="size-4" /> }, { value: "grid", icon: <LayoutGrid className="size-4" /> }]} data-testid="members-view-toggle" />
              </div>
            </div>
            <p className="mb-3 text-xs text-ink-3" data-testid="members-result-count">Menampilkan {filtered.length} dari {users.length} member</p>

            {isError ? (
              <EmptyState title="Gagal memuat member" hint="Periksa koneksi ke server API PalembangPy" testId="members-error" />
            ) : view === "table" ? (
              <Table<User>
                rowKey="id"
                loading={isLoading}
                dataSource={filtered}
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                locale={{ emptyText: <EmptyState title="Member tidak ditemukan" hint="Coba ubah kata kunci atau filter." /> }}
                onRow={(u) => ({ onClick: () => openDetail(u), className: "cursor-pointer", "data-testid": `member-row-${u.member_code}` } as React.HTMLAttributes<HTMLElement>)}
                rowClassName={(u) => (u.deleted_at ? "opacity-50" : "")}
                data-testid="members-table"
                columns={[
                  { title: "Member", key: "m", render: (_, u) => <div className="flex items-center gap-3"><Avatar src={u.avatar_url} name={u.name} /><div><p className="font-semibold">{u.name}</p><p className="font-mono text-[11px] text-ink-3">{u.member_code}</p></div></div> },
                  { title: "Username", key: "u", responsive: ["md"], render: (_, u) => <span className="text-ink-2">{u.username ? `@${u.username}` : "—"}</span> },
                  { title: "Peran", key: "r", render: (_, u) => <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", ROLE_STYLE[roleOf(u)])}>{roleOf(u)}</span> },
                  { title: "Poin", dataIndex: "points", key: "p", align: "center", responsive: ["sm"], sorter: (a, b) => (a.points ?? 0) - (b.points ?? 0), render: (v?: number) => <b>{v ?? 0}</b> },
                  { title: "Bergabung", key: "j", responsive: ["lg"], sorter: (a, b) => a.created_at.localeCompare(b.created_at), render: (_, u) => <span className="text-ink-3">{fmt(u.created_at)}</span> },
                  { title: "Status", key: "s", responsive: ["sm"], render: (_, u) => <span className="inline-flex items-center gap-1.5 text-xs text-ink-2"><span className={cn("size-1.5 rounded-full", u.deleted_at ? "bg-[#98A2B3]" : "bg-[#12B76A]")} />{u.deleted_at ? "Terhapus" : "Aktif"}</span> },
                  { key: "a", width: 48, render: (_, u) => RowMenu(u) },
                ]}
              />
            ) : filtered.length === 0 ? (
              <EmptyState title="Member tidak ditemukan" testId="members-empty" />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3" data-testid="members-grid">
                {filtered.map((u, i) => (
                  <div key={u.id} data-testid={`member-tile-${u.member_code}`} className={cn("bento-hover animate-fade-up relative overflow-hidden rounded-[20px] p-4", ["bg-mint", "bg-pink", "bg-butter", "bg-lilac"][i % 4], u.deleted_at && "opacity-60")} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                    <div className="flex items-start gap-3">
                      <Avatar src={u.avatar_url} name={u.name} className="size-12 ring-2 ring-white" />
                      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{u.name}</p><p className="text-xs text-ink-2">{roleOf(u)} · {u.points ?? 0} poin</p></div>
                      {RowMenu(u)}
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-bold">{u.member_code}</p>
                        <button onClick={() => openDetail(u)} className="mt-2 text-xs font-semibold underline-offset-4 hover:underline" data-testid={`member-tile-open-${u.member_code}`}>Buka kartu →</button>
                      </div>
                      <div className="rounded-xl bg-white p-1.5"><Qr value={u.member_code} size={64} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <IdCardModal user={cardUser} onClose={() => setCardUser(null)} />

      <Drawer open={!!detail} onClose={closeDetail} size={460} title="Kartu Member" data-testid="member-detail-drawer">
        {detail && <MemberDetail member={detail} />}
      </Drawer>

      <FormModal<UserCreate>
        open={formOpen}
        onClose={() => setFormOpen(false)}
        testId="member-form-modal"
        title={editing ? `Edit ${editing.member_code}` : "Tambah Member Baru"}
        description={editing ? "Perbarui profil member." : "Kode member & password otomatis dibuat oleh API."}
        initialValues={editing ?? { is_admin: false, is_staff: false, points: 0 }}
        pending={save.isPending}
        submitLabel={editing ? "Simpan perubahan" : "Daftarkan member"}
        onSubmit={(v) => save.mutate(clean({ ...v }) as UserCreate, { onSuccess: (r) => { setFormOpen(false); if (!editing && (r as UserCreateResponse).generated_password) setCreated(r as UserCreateResponse); } })}
      >
        <Form.Item name="name" label="Nama lengkap" rules={[{ required: true, min: 2, message: "Minimal 2 karakter" }]}><Input data-testid="member-form-name" /></Form.Item>
        <Form.Item name="username" label="Username" rules={[{ min: 2, message: "Minimal 2 karakter" }]}><Input prefix="@" data-testid="member-form-username" /></Form.Item>
        <Form.Item name="telegram_id" label="Telegram ID"><Input data-testid="member-form-telegram" /></Form.Item>
        <Form.Item name="points" label="Poin"><InputNumber min={0} className="w-full" data-testid="member-form-points" /></Form.Item>
        <Form.Item name="avatar_url" label="URL foto" className={full}><Input placeholder="https://..." data-testid="member-form-avatar" /></Form.Item>
        <Form.Item name="bio" label="Bio" className={full} rules={[{ max: 500 }]}><Input.TextArea rows={2} showCount maxLength={500} data-testid="member-form-bio" /></Form.Item>
        {SOCIAL.map((k) => <Form.Item key={k} name={k} label={k.replace("_url", "").replace(/^\w/, (c) => c.toUpperCase())}><Input placeholder="https://..." data-testid={`member-form-${k}`} /></Form.Item>)}
        <div className="flex gap-6">
          <Form.Item name="is_admin" label="Admin" valuePropName="checked"><Switch data-testid="member-form-admin" /></Form.Item>
          <Form.Item name="is_staff" label="Staff" valuePropName="checked"><Switch data-testid="member-form-staff" /></Form.Item>
        </div>
      </FormModal>

      <Modal open={!!created} onCancel={() => setCreated(null)} footer={<Button type="primary" shape="round" onClick={() => setCreated(null)} data-testid="created-member-close">Selesai</Button>} title="Member terdaftar 🎉" data-testid="created-member-modal">
        {created && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-2xl bg-mint p-4">
              <div className="rounded-xl bg-white p-1.5"><Qr value={created.member_code} size={88} /></div>
              <div><p className="font-semibold">{created.name}</p><p className="font-mono text-sm" data-testid="created-member-code">{created.member_code}</p></div>
            </div>
            <div className="rounded-2xl bg-butter p-4">
              <p className="label-xs">Password awal (hanya ditampilkan sekali)</p>
              <Typography.Text copyable className="font-mono text-lg font-bold" data-testid="created-member-password">{created.generated_password}</Typography.Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
