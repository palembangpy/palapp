import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Input } from "antd";
import { BadgeCheck, CalendarDays, Download, FileSearch, ShieldX, UserRound } from "lucide-react";
import { PageHeader, QrCode } from "@/components/ui-kit";
import { fmt } from "@/lib/format";
import { API_ORIGIN, errMsg, get } from "@/lib/http";
import type { Certificate } from "@/lib/types";

const fileUrl = (p: string) => (/^https?:\/\//.test(p) ? p : `${API_ORIGIN}/${p.replace(/^\/+/, "")}`);

export default function Verify() {
  const [params, setParams] = useSearchParams();
  const code = params.get("code") ?? "";
  const [input, setInput] = useState(code);
  const { data, isFetching, error } = useQuery({
    queryKey: ["verify", code],
    queryFn: () => get<Certificate>(`/certificates/verify/${encodeURIComponent(code)}`),
    enabled: !!code,
    retry: false,
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) setParams({ code: input.trim() });
  };

  return (
    <div data-testid="verify-page">
      <PageHeader eyebrow="Keaslian dokumen" title="Verifikasi Sertifikat" description="Masukkan kode sertifikat PalembangPy untuk memastikan keasliannya." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <form onSubmit={submit} className="relative overflow-hidden rounded-[28px] bg-lilac p-6 animate-fade-up sm:p-8 xl:col-span-5" data-testid="verify-form">
          <div className="absolute -right-12 -top-12 size-44 rounded-full bg-white/30" aria-hidden />
          <span className="relative flex size-12 items-center justify-center rounded-2xl bg-ink text-butter"><FileSearch className="size-5" /></span>
          <p className="relative mt-4 text-2xl font-bold tracking-tight">Cek kode sertifikat</p>
          <p className="relative mt-1 text-sm text-ink-2">Kode tercetak di bagian bawah sertifikat peserta, speaker, atau panitia.</p>
          <Input size="large" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Contoh: CERT-XXXX" className="relative mt-6 rounded-full font-mono" data-testid="verify-code-input" />
          <Button type="primary" htmlType="submit" size="large" shape="round" block className="relative mt-3" loading={isFetching} icon={<BadgeCheck className="size-4" />} data-testid="verify-submit-button">Verifikasi</Button>
        </form>

        <section className="xl:col-span-7" aria-live="polite">
          {!code ? (
            <div className="bento flex h-full flex-col items-center justify-center py-14 text-center animate-fade-up" data-testid="verify-idle">
              <BadgeCheck className="mb-3 size-10 text-ink-3" />
              <p className="font-semibold">Belum ada kode yang dicek</p>
              <p className="text-sm text-ink-3">Hasil verifikasi akan tampil di sini.</p>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center rounded-[24px] bg-pink py-14 text-center animate-pop" data-testid="verify-invalid">
              <ShieldX className="mb-3 size-10 text-[#B42318]" />
              <p className="text-lg font-bold">Sertifikat tidak valid</p>
              <p className="text-sm text-ink-2">Kode <span className="font-mono">{code}</span> — {errMsg(error)}</p>
            </div>
          ) : data ? (
            <div className="relative overflow-hidden rounded-[24px] border-2 border-ink bg-white p-6 animate-pop sm:p-8" data-testid="verify-valid">
              <div className="absolute right-0 top-0 rounded-bl-[20px] bg-[#D1FADF] px-4 py-2 text-xs font-bold text-[#05603A]"><BadgeCheck className="mr-1 inline size-4" />TERVERIFIKASI</div>
              <p className="label-xs">Sertifikat PalembangPy</p>
              <p className="mt-3 text-sm text-ink-3">Diberikan kepada</p>
              <p className="text-3xl font-bold tracking-tight" data-testid="verify-recipient">{data.recipient_name}</p>
              <p className="mt-2 text-sm text-ink-2">sebagai <b className="capitalize">{data.role}</b> pada</p>
              <p className="text-lg font-semibold" data-testid="verify-event-name">{data.event_name}</p>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-dashed border-black/15 pt-5">
                <div className="space-y-1 text-xs text-ink-2">
                  <p className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />Diterbitkan {fmt(data.created_at, "D MMMM YYYY")}</p>
                  <p className="flex items-center gap-1.5"><UserRound className="size-3.5" />ID penerima <span className="font-mono">{data.user_id.slice(0, 8)}…</span></p>
                  <p className="font-mono text-sm font-bold text-ink" data-testid="verify-code">{data.code}</p>
                </div>
                <div className="flex items-end gap-3">
                  <div className="rounded-xl bg-canvas p-1.5"><QrCode value={`${window.location.origin}/verify?code=${data.code}`} size={84} /></div>
                  {data.file_path && <a href={fileUrl(data.file_path)} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white" data-testid="verify-download-link"><Download className="size-4" />File</a>}
                </div>
              </div>
            </div>
          ) : (
            <div className="bento h-64 animate-pulse" />
          )}
        </section>
      </div>
    </div>
  );
}
