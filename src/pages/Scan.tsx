import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Input, Select } from "antd";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, CheckCircle2, Download, Keyboard, RotateCcw, ScanLine, XCircle } from "lucide-react";
import { Avatar, EmptyState, Locked, PageHeader } from "@/components/ui-kit";
import { fmt, isUpcoming, relDay } from "@/lib/format";
import { errMsg, post } from "@/lib/http";
import { notify } from "@/lib/notify";
import { queryClient } from "@/lib/queryClient";
import { isAuthed, useEvents, useRegistrations, useUsers, useRole } from "@/lib/queries";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Result = { ok: boolean; title: string; sub: string; user?: User };

function feedback(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 880 : 220;
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.15 : 0.3));
  } catch {
    /* audio unavailable */
  }
  navigator.vibrate?.(ok ? 120 : [80, 60, 80]);
}

export default function Scan() {
  const { isAdmin: authed } = useRole();
  const [params] = useSearchParams();
  const { data: events = [] } = useEvents();
  const { data: users = [] } = useUsers();
  const [eventId, setEventId] = useState(params.get("event") ?? "");
  const sorted = useMemo(() => [...events].sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? "")), [events]);
  const activeId = eventId || sorted.find((e) => isUpcoming(e.start_time))?.id || sorted[sorted.length - 1]?.id || "";
  const event = events.find((e) => e.id === activeId);
  const { data: regs = [], isLoading: regsLoading } = useRegistrations(activeId || null, true);

  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lockRef = useRef(false);
  const ctxRef = useRef({ activeId, users });
  ctxRef.current = { activeId, users };

  const regIds = new Set(regs.map((r) => r.user_id ?? r.user?.id));

  const checkIn = async (raw: string) => {
    const { activeId: ev, users: us } = ctxRef.current;
    const code = raw.trim().toUpperCase();
    const user = us.find((u) => u.member_code.toUpperCase() === code || u.username?.toUpperCase() === code || u.telegram_id === raw.trim());
    if (!ev) return notify.error("Pilih event terlebih dahulu");
    if (!user) {
      feedback(false);
      setResult({ ok: false, title: "Member tidak dikenal", sub: `Kode "${raw.trim()}" tidak terdaftar di PalembangPy` });
      return;
    }
    setBusy(true);
    try {
      await post(`/events/${ev}/register`, { user_id: user.id });
      feedback(true);
      setResult({ ok: true, title: "Presensi Berhasil!", sub: `${user.name} (${user.member_code}) tercatat hadir`, user });
      notify.success(`${user.name} hadir ✓`);
      await queryClient.invalidateQueries({ queryKey: ["registrations", ev] });
    } catch (e) {
      feedback(false);
      setResult({ ok: false, title: "Presensi Gagal", sub: errMsg(e), user });
    } finally {
      setBusy(false);
      lockRef.current = false;
    }
  };

  const stop = async () => {
    const s = scannerRef.current;
    if (s?.isScanning) await s.stop().catch(() => {});
    setScanning(false);
  };

  const start = async () => {
    setCamError(null);
    setResult(null);
    setStarting(true);
    lockRef.current = false;
    try {
      const s = scannerRef.current ?? new Html5Qrcode("reader", false);
      scannerRef.current = s;
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, async (text) => {
        if (lockRef.current) return;
        lockRef.current = true;
        await stop(); // release camera right after a successful read
        void checkIn(text);
      }, () => {});
      setScanning(true);
    } catch (e) {
      setCamError(/Permission|NotAllowed/i.test(String(e)) ? "Izin kamera ditolak. Izinkan akses kamera di browser lalu coba lagi." : "Kamera tidak tersedia. Pastikan HTTPS & perangkat punya kamera, atau gunakan input manual.");
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => () => {
    const s = scannerRef.current;
    if (s?.isScanning) s.stop().catch(() => {});
  }, []);

  const manualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!manual.trim()) return;
    void checkIn(manual);
    setManual("");
  };
  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = regs.map((r, i) => {
      const u = r.user ?? users.find((x) => x.id === r.user_id);
      return [i + 1, u?.name, u?.member_code, u?.username, u?.telegram_id, fmt(r.created_at ?? r.registered_at, "YYYY-MM-DD HH:mm")].map(esc).join(",");
    });
    const csv = ["No,Nama,Member Code,Username,Telegram ID,Waktu Check-in", ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `presensi-${(event?.title ?? "event").replace(/\s+/g, "_")}-${fmt(event?.start_time, "YYYYMMDD")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify.success(`${regs.length} data kehadiran diekspor`);
  };
  const quick = users.filter((u) => !regIds.has(u.id) && !u.deleted_at).slice(0, 4);

  return (
    <div data-testid="scan-page">
      <PageHeader eyebrow="Check-in terminal" title="Scan QR Presensi" description="Arahkan kamera ke QR kartu member (member_code). Member otomatis didaftarkan ke event lewat /events/{id}/register." />
      {!authed ? (
        <Locked what="presensi member" testId="scan-locked" adminOnly={isAuthed()} />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <section className="space-y-5 xl:col-span-7">
            <div className="bento animate-fade-up">
              <p className="label-xs mb-2">Event aktif</p>
              <Select size="large" value={activeId || undefined} onChange={(v: string) => { setEventId(v); setResult(null); }} placeholder="Pilih event..." className="w-full" data-testid="scan-event-select" options={sorted.slice().reverse().map((e) => ({ value: e.id, label: `${e.title} · ${fmt(e.start_time, "D MMM YYYY")}` }))} />
              <div className="relative mt-5 overflow-hidden rounded-[24px] bg-ink" style={{ minHeight: 340 }}>
                <div id="reader" data-testid="scan-reader" className="w-full" />
                {!scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
                    <div className="relative flex size-44 items-center justify-center rounded-[28px] border-2 border-dashed border-white/25">
                      <ScanLine className="size-14 text-butter" strokeWidth={1.5} />
                      <span className="absolute left-3 right-3 h-0.5 rounded-full bg-butter/80 shadow-[0_0_14px_#FFE9A0] animate-scan-line" />
                    </div>
                    <p className="max-w-xs text-sm text-white/70" data-testid="scan-camera-message">{camError ?? "Kamera belakang akan digunakan. Pastikan cahaya cukup terang."}</p>
                    {camError && <CameraOff className="size-5 text-[#F7A8C9]" />}
                  </div>
                )}
                {scanning && <span className="pointer-events-none absolute inset-x-[18%] h-0.5 rounded-full bg-butter shadow-[0_0_14px_#FFE9A0] animate-scan-line" />}
              </div>
              <div className="mt-4">
                {!scanning ? (
                  <Button type="primary" size="large" shape="round" block icon={<Camera className="size-4" />} loading={starting} disabled={!activeId} onClick={start} data-testid="scan-start-button">{result ? "Scan berikutnya" : "Mulai scan kamera"}</Button>
                ) : (
                  <Button size="large" shape="round" block icon={<CameraOff className="size-4" />} onClick={stop} data-testid="scan-stop-button">Matikan kamera</Button>
                )}
              </div>
              <div aria-live="polite">
                {busy && <p className="mt-4 text-sm text-ink-3">Mendaftarkan presensi...</p>}
                {result && !busy && (
                  <div data-testid="scan-result" className={cn("mt-4 flex items-center gap-4 rounded-[20px] p-4 animate-pop", result.ok ? "bg-[#D1FADF]" : "bg-pink")}>
                    {result.user ? <Avatar src={result.user.avatar_url} name={result.user.name} className="size-12" /> : <XCircle className="size-10 text-[#B42318]" />}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 font-semibold" data-testid="scan-result-title">{result.ok && <CheckCircle2 className="size-4 text-[#079455]" />}{result.title}</p>
                      <p className="text-sm text-ink-2" data-testid="scan-result-message">{result.sub}</p>
                    </div>
                    <button onClick={() => setResult(null)} className="rounded-full p-2 hover:bg-white/60" aria-label="Tutup" data-testid="scan-result-dismiss"><RotateCcw className="size-4" /></button>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={manualSubmit} className="bento animate-fade-up" data-testid="scan-manual-form">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-butter"><Keyboard className="size-4" /></span>
                <div><p className="font-semibold">Input manual</p><p className="text-xs text-ink-3">Ketik member_code / username / Telegram ID lalu Enter</p></div>
              </div>
              <div className="flex gap-2">
                <Input size="large" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="PALPY2610216877" className="flex-1 rounded-full font-mono" data-testid="scan-manual-input" />
                <Button type="primary" htmlType="submit" size="large" shape="round" loading={busy} disabled={!activeId} data-testid="scan-manual-submit">Check-in</Button>
              </div>
              {quick.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-ink-3">Belum hadir:</span>
                  {quick.map((u) => <button type="button" key={u.id} onClick={() => setManual(u.member_code)} data-testid={`scan-quick-${u.member_code}`} className="rounded-full bg-mint px-3 py-1 font-mono text-[11px] font-semibold transition-transform hover:-translate-y-0.5">{u.name.split(" ")[0]} · {u.member_code.slice(-4)}</button>)}
                </div>
              )}
            </form>
          </section>

          <section className="space-y-5 xl:col-span-5">
            <div className="rounded-[24px] bg-pink p-5 animate-fade-up sm:p-6" data-testid="scan-event-summary">
              {event ? (
                <>
                  <p className="text-xl font-bold tracking-tight">{event.title}</p>
                  <p className="text-sm text-ink-2">{fmt(event.start_time, "dddd, D MMM YYYY · HH:mm")} · {relDay(event.start_time)}</p>
                  <div className="mt-5 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-2xl bg-white/80 p-3" data-testid="scan-stat-present"><p className="text-2xl font-bold">{regs.length}</p><p className="text-[11px] text-ink-3">Hadir / terdaftar</p></div>
                    <div className="rounded-2xl bg-white/80 p-3" data-testid="scan-stat-remaining"><p className="text-2xl font-bold">{Math.max(0, users.filter((u) => !u.deleted_at).length - regs.length)}</p><p className="text-[11px] text-ink-3">Belum hadir</p></div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-2">Pilih event untuk mulai presensi.</p>
              )}
            </div>
            <div className="bento animate-fade-up" data-testid="scan-live-feed">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-tight">Live Feed Kehadiran</h3>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#079455]"><span className="size-2 animate-pulse rounded-full bg-[#12B76A]" /> LIVE</span>
                  <Button size="small" shape="round" icon={<Download className="size-3.5" />} disabled={!regs.length} onClick={exportCsv} data-testid="scan-export-csv-button">CSV</Button>
                </div>
              </div>
              {regsLoading ? (
                <div className="h-40 animate-pulse rounded-2xl bg-pill" />
              ) : regs.length === 0 ? (
                <EmptyState title="Belum ada yang check-in" hint="Scan QR pertama untuk event ini." testId="scan-feed-empty" />
              ) : (
                <ul className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                  {[...regs].reverse().map((r, i) => {
                    const u = r.user ?? users.find((x) => x.id === r.user_id);
                    return (
                      <li key={r.id ?? i} data-testid={`scan-feed-item-${u?.member_code ?? i}`} className={cn("flex items-center gap-3 rounded-2xl border border-black/[0.05] p-2.5 pr-3", i === 0 ? "bg-mint animate-pop" : "bg-white")}>
                        <Avatar src={u?.avatar_url} name={u?.name ?? "Member"} className="size-9" />
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{u?.name ?? r.user_id}</p><p className="font-mono text-[11px] text-ink-3">{u?.member_code ?? "—"}</p></div>
                        <span className="text-[11px] text-ink-3">{fmt(r.created_at ?? r.registered_at, "HH:mm")}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
