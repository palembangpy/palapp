import { useQuery } from "@tanstack/react-query";
import { Button, Modal } from "antd";
import { FileDown, ImageDown, Printer } from "lucide-react";
import { useState } from "react";
import { downloadIdCardPdf, downloadIdCardPng, printIdCard, renderIdCard } from "@/lib/idcard";
import { notify } from "@/lib/notify";
import type { User } from "@/lib/types";

/** Preview of the printable 85.6×54 mm member ID card with PNG / PDF / print actions. */
export function IdCardModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { data: src, isLoading, isError } = useQuery({
    queryKey: ["idcard", user?.id, user?.avatar_url, user?.name, user?.points],
    queryFn: () => renderIdCard(user!),
    enabled: !!user,
    staleTime: Infinity,
    retry: false,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const run = (key: string, fn: (u: User) => Promise<void>, ok: string) => async () => {
    if (!user) return;
    setBusy(key);
    try {
      await fn(user);
      notify.success(ok);
    } catch {
      notify.error(key === "print" ? "Popup diblokir browser — izinkan popup untuk mencetak" : "Gagal membuat kartu");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={!!user} onCancel={onClose} footer={null} width={620} destroyOnHidden title={<span className="text-xl font-bold tracking-tight">Kartu Member</span>} data-testid="idcard-modal">
      <p className="-mt-1 mb-4 text-sm text-ink-3">Ukuran kartu ID standar 85,6 × 54 mm (300 dpi), siap cetak di kertas PVC/art paper.</p>
      <div className="overflow-hidden rounded-[18px] bg-canvas shadow-[0_18px_40px_-22px_rgba(16,24,40,0.55)]" style={{ aspectRatio: "85.6 / 54" }}>
        {isLoading && <div className="size-full animate-pulse bg-pill" data-testid="idcard-loading" />}
        {isError && <div className="flex size-full items-center justify-center text-sm text-ink-3" data-testid="idcard-error">Gagal membuat pratinjau kartu</div>}
        {src && <img src={src} alt={`Kartu ${user?.name}`} className="size-full animate-pop" data-testid="idcard-preview" />}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button shape="round" size="large" icon={<ImageDown className="size-4" />} loading={busy === "png"} disabled={!src} onClick={run("png", downloadIdCardPng, "Kartu PNG diunduh")} data-testid="idcard-download-png">PNG</Button>
        <Button shape="round" size="large" icon={<FileDown className="size-4" />} loading={busy === "pdf"} disabled={!src} onClick={run("pdf", downloadIdCardPdf, "Kartu PDF diunduh")} data-testid="idcard-download-pdf">PDF</Button>
        <Button type="primary" shape="round" size="large" icon={<Printer className="size-4" />} loading={busy === "print"} disabled={!src} onClick={run("print", printIdCard, "Dialog cetak dibuka")} data-testid="idcard-print">Cetak</Button>
      </div>
    </Modal>
  );
}
