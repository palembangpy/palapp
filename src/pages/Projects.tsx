import { useMemo, useState } from "react";
import { AutoComplete, Button, Dropdown, Form, Input, Modal, Segmented, Select, Switch } from "antd";
import { ExternalLink, Github, MoreHorizontal, Pencil, Plus, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { FormModal, full } from "@/components/FormModal";
import { Avatar, EmptyState, PageHeader, StatTile, UserSelect } from "@/components/ui-kit";
import { clean, fmt, splitTags } from "@/lib/format";
import { del, patch, post } from "@/lib/http";
import { isAuthed, useAction, useProjects, useUsers, useRole } from "@/lib/queries";
import type { Project, ProjectBase } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_OPTS = ["active", "in_progress", "completed", "archived"].map((value) => ({ value }));
const STATUS_STYLE: Record<string, string> = { active: "bg-[#D1FADF] text-[#05603A]", completed: "bg-mint", in_progress: "bg-butter", archived: "bg-pill text-ink-3" };

export default function Projects() {
  const { isAdmin: authed } = useRole();
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const { data: projects = [], isLoading } = useProjects(featuredOnly);
  const { data: users = [] } = useUsers();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState("newest");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [modal, ctx] = Modal.useModal();
  const save = useAction((b: ProjectBase) => (editing ? patch(`/projects/${editing.id}`, { ...b, user_id: undefined }) : post("/projects", b)), editing ? "Project diperbarui" : "Project masuk showcase!");
  const feature = useAction((p: Project) => patch(`/projects/${p.id}`, { is_featured: !p.is_featured }), "Status unggulan diubah");
  const remove = useAction(({ id, hard }: { id: string; hard: boolean }) => del(`/projects/${id}/${hard ? "hard" : "soft"}`), "Project dihapus");

  const tags = useMemo(() => {
    const c = new Map<string, number>();
    projects.forEach((p) => splitTags(p.tags).forEach((t) => c.set(t, (c.get(t) ?? 0) + 1)));
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [projects]);
  const owner = (id: string) => users.find((u) => u.id === id);
  const k = q.trim().toLowerCase();
  const filtered = projects
    .filter((p) => (tag === "all" || splitTags(p.tags).includes(tag)) && (!k || `${p.title} ${p.description ?? ""} ${p.tags ?? ""}`.toLowerCase().includes(k)))
    .sort((a, b) => (sort === "newest" ? b.created_at.localeCompare(a.created_at) : sort === "featured" ? Number(b.is_featured) - Number(a.is_featured) : a.title.localeCompare(b.title)));
  const confirmDelete = (p: Project, hard: boolean) => modal.confirm({ title: `${hard ? "Hapus permanen" : "Arsipkan"} ${p.title}?`, okText: "Hapus", okButtonProps: { danger: true }, onOk: () => remove.mutateAsync({ id: p.id, hard }) });

  return (
    <div data-testid="projects-page">
      {ctx}
      <PageHeader
        eyebrow="Open source Wong Kito"
        title="Project Showcase"
        description="Karya member PalembangPy — repo, demo, dan project unggulan komunitas."
        actions={isAuthed() ? <Button type="primary" shape="round" icon={<Plus className="size-4" />} onClick={() => { setEditing(null); setFormOpen(true); }} data-testid="projects-add-button">Submit Project</Button> : undefined}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile testId="projects-stat-total" tone="lilac" label="Project" value={projects.length} hint="Di showcase" />
        <StatTile testId="projects-stat-featured" tone="butter" label="Unggulan" value={projects.filter((p) => p.is_featured).length} hint="Pilihan komunitas" delay={60} />
        <StatTile testId="projects-stat-github" tone="white" label="Repo GitHub" value={projects.filter((p) => p.github_url).length} hint="Open source" delay={120} />
        <StatTile testId="projects-stat-demo" tone="ink" label="Live demo" value={projects.filter((p) => p.demo_url).length} hint="Bisa dicoba" delay={180} />
      </div>

      <section className="bento mb-4 animate-fade-up">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input allowClear size="large" prefix={<Search className="size-4 text-ink-3" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul, deskripsi, tag..." className="flex-1 rounded-full" data-testid="projects-search-input" />
          <Segmented shape="round" value={featuredOnly ? "u" : "a"} onChange={(v) => setFeaturedOnly(v === "u")} options={[{ value: "a", label: "Semua" }, { value: "u", label: "Unggulan" }]} data-testid="projects-featured-filter" />
          <Select size="large" value={sort} onChange={setSort} className="md:w-44" data-testid="projects-sort-select" options={[{ value: "newest", label: "Terbaru" }, { value: "featured", label: "Unggulan dulu" }, { value: "name", label: "Nama A–Z" }]} />
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[["all", projects.length] as [string, number], ...tags].map(([t, n]) => (
              <button key={t} onClick={() => setTag(t)} data-testid={`projects-tag-${t.toLowerCase()}`} className={cn("rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors", tag === t ? "border-ink bg-ink text-white" : "border-black/10 bg-white text-ink-2 hover:border-ink/40")}>
                {t === "all" ? "semua" : t} <span className="opacity-50">{n}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-56 animate-pulse rounded-[24px] bg-white" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Belum ada project di showcase" hint="Jadilah yang pertama memamerkan karya Python Wong Kito!" testId="projects-empty" action={isAuthed() ? <Button type="primary" shape="round" onClick={() => { setEditing(null); setFormOpen(true); }} data-testid="projects-empty-add">Submit project</Button> : undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="projects-grid">
          {filtered.map((p, i) => {
            const o = owner(p.user_id);
            return (
              <article key={p.id} data-testid={`project-card-${p.id}`} style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }} className={cn("bento-hover animate-fade-up flex flex-col overflow-hidden rounded-[24px] border border-black/[0.04]", p.is_featured ? "bg-lilac md:col-span-2" : "bg-white")}>
                {p.image_url && <img src={p.image_url} alt={p.title} className="h-40 w-full object-cover" />}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink font-mono text-sm font-bold text-butter">{p.title.slice(0, 2).toUpperCase()}</span>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-base font-bold" data-testid={`project-title-${p.id}`}>{p.title}</p>
                        <div className="flex items-center gap-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_STYLE[p.status ?? ""] ?? "bg-pill")}>{p.status}</span>
                          {p.is_featured && <span className="flex items-center gap-1 text-[11px] font-semibold"><Sparkles className="size-3" /> Unggulan</span>}
                        </div>
                      </div>
                    </div>
                    {authed && (
                      <Dropdown trigger={["click"]} menu={{ items: [
                        { key: "f", icon: <Star className="size-4" />, label: p.is_featured ? "Lepas unggulan" : "Jadikan unggulan", onClick: () => feature.mutate(p) },
                        { key: "e", icon: <Pencil className="size-4" />, label: "Edit", onClick: () => { setEditing(p); setFormOpen(true); } },
                        { key: "s", icon: <Trash2 className="size-4" />, label: "Arsipkan (soft)", danger: true, onClick: () => confirmDelete(p, false) },
                        { key: "h", icon: <Trash2 className="size-4" />, label: "Hapus permanen", danger: true, onClick: () => confirmDelete(p, true) },
                      ] }}>
                        <button className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-white/70" aria-label="Aksi project" data-testid={`project-menu-${p.id}`}><MoreHorizontal className="size-4" /></button>
                      </Dropdown>
                    )}
                  </div>
                  {p.description && <p className="mt-3 line-clamp-3 text-sm text-ink-2">{p.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {splitTags(p.tags).map((t) => <span key={t} className={cn("rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold", t.toLowerCase() === "python" ? "bg-[#3776AB] text-white" : "bg-ink/[0.06] text-ink-2")}>{t}</span>)}
                  </div>
                  <div className="mt-auto flex items-center gap-2 pt-5">
                    <Avatar src={o?.avatar_url} name={o?.name ?? "Member"} className="size-7" />
                    <span className="truncate text-xs font-semibold">{o?.name ?? fmt(p.created_at)}</span>
                    <div className="ml-auto flex gap-1.5">
                      {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" aria-label="GitHub" data-testid={`project-github-${p.id}`} className="flex size-8 items-center justify-center rounded-full bg-ink text-white transition-transform hover:-translate-y-0.5"><Github className="size-4" /></a>}
                      {p.demo_url && <a href={p.demo_url} target="_blank" rel="noreferrer" aria-label="Demo" data-testid={`project-demo-${p.id}`} className="flex size-8 items-center justify-center rounded-full bg-butter transition-transform hover:-translate-y-0.5"><ExternalLink className="size-4" /></a>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <FormModal<ProjectBase>
        open={formOpen}
        onClose={() => setFormOpen(false)}
        testId="project-form-modal"
        title={editing ? "Edit Project" : "Submit Project Showcase"}
        initialValues={editing ?? { is_featured: false, status: "active" }}
        pending={save.isPending}
        onSubmit={(v) => save.mutate(clean({ ...v }) as ProjectBase, { onSuccess: () => setFormOpen(false) })}
      >
        <Form.Item name="title" label="Judul / nama repo" rules={[{ required: true }]}><Input data-testid="project-form-title" /></Form.Item>
        {!editing ? (
          <Form.Item name="user_id" label="Pemilik" rules={[{ required: true, message: "Pilih member" }]}><UserSelect users={users} testId="project-form-owner" /></Form.Item>
        ) : (
          <Form.Item label="Pemilik"><Input disabled value={owner(editing.user_id)?.name ?? editing.user_id} /></Form.Item>
        )}
        <Form.Item name="description" label="Deskripsi" className={full}><Input.TextArea rows={3} data-testid="project-form-description" /></Form.Item>
        <Form.Item name="tags" label="Tag (pisahkan koma)" className={full}><Input placeholder="Python, FastAPI, AI" data-testid="project-form-tags" /></Form.Item>
        <Form.Item name="github_url" label="GitHub URL"><Input placeholder="https://github.com/..." data-testid="project-form-github" /></Form.Item>
        <Form.Item name="demo_url" label="Demo URL"><Input data-testid="project-form-demo" /></Form.Item>
        <Form.Item name="image_url" label="URL gambar cover" className={full}><Input data-testid="project-form-image" /></Form.Item>
        <Form.Item name="status" label="Status"><AutoComplete options={STATUS_OPTS} data-testid="project-form-status" /></Form.Item>
        <Form.Item name="is_featured" label="Unggulan" valuePropName="checked"><Switch data-testid="project-form-featured" /></Form.Item>
      </FormModal>
    </div>
  );
}
