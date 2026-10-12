import dayjs from "dayjs";
import "dayjs/locale/id";
import type { User } from "@/lib/types";

dayjs.locale("id");

export { dayjs };

export const fmt = (iso?: string | null, pattern = "D MMM YYYY") => (iso ? dayjs(iso).format(pattern) : "—");

export const relDay = (iso?: string | null) => {
  if (!iso) return "Belum dijadwalkan";
  const d = dayjs(iso).startOf("day").diff(dayjs().startOf("day"), "day");
  if (d === 0) return "Hari ini";
  if (d === 1) return "Besok";
  if (d === -1) return "Kemarin";
  return d > 0 ? `${d} hari lagi` : `${-d} hari lalu`;
};

export const isUpcoming = (iso?: string | null) => !!iso && !dayjs(iso).isBefore(dayjs(), "day");

export const rupiah = (n?: number | null) => (n ? `Rp ${Math.round(n).toLocaleString("id-ID")}` : "Gratis");

export const roleOf = (u: Pick<User, "is_admin" | "is_staff">) => (u.is_admin ? "Admin" : u.is_staff ? "Staff" : "Member");

export const ROLE_STYLE: Record<string, string> = {
  Admin: "bg-ink text-white",
  Staff: "bg-lilac text-ink",
  Member: "bg-mint text-ink",
};

export const TINTS = ["bg-mint", "bg-pink", "bg-butter", "bg-lilac"];
export const tintFor = (s: string) => TINTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

export const splitTags = (s?: string | null) => (s ?? "").split(",").map((t) => t.trim()).filter(Boolean);

export const clean = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === "" || v === undefined ? null : v])) as T;

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
