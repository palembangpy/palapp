import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { dayjs, fmt } from "@/lib/format";
import type { CommunityEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOW = ["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"];

export function MiniCalendar({ events }: { events: CommunityEvent[] }) {
  const today = dayjs().format("YYYY-MM-DD");
  const [cursor, setCursor] = useState(() => dayjs().startOf("month"));
  const [selected, setSelected] = useState<string | null>(null);
  const byDate = useMemo(() => {
    const m = new Map<string, CommunityEvent[]>();
    events.forEach((e) => {
      if (!e.start_time) return;
      const k = dayjs(e.start_time).format("YYYY-MM-DD");
      m.set(k, [...(m.get(k) ?? []), e]);
    });
    return m;
  }, [events]);
  const start = cursor.subtract((cursor.day() + 6) % 7, "day");
  const days = Array.from({ length: 42 }, (_, i) => start.add(i, "day"));
  const sel = selected ? byDate.get(selected) ?? [] : [];

  return (
    <div className="bento animate-fade-up" data-testid="mini-calendar">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-ink">Kalender</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor((c) => c.subtract(1, "month"))} className="flex size-7 items-center justify-center rounded-full hover:bg-pill" data-testid="calendar-prev-month" aria-label="Bulan sebelumnya"><ChevronLeft className="size-4" /></button>
          <span className="min-w-[110px] text-center text-sm capitalize text-ink-2" data-testid="calendar-month-label">{cursor.format("MMMM YYYY")}</span>
          <button onClick={() => setCursor((c) => c.add(1, "month"))} className="flex size-7 items-center justify-center rounded-full hover:bg-pill" data-testid="calendar-next-month" aria-label="Bulan berikutnya"><ChevronRight className="size-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((d) => <span key={d} className="pb-2 text-[11px] font-medium text-ink-3">{d}</span>)}
        {days.map((d) => {
          const iso = d.format("YYYY-MM-DD");
          const evs = byDate.get(iso);
          const isToday = iso === today;
          const inMonth = d.month() === cursor.month();
          return (
            <button
              key={iso}
              onClick={() => setSelected(evs ? (selected === iso ? null : iso) : null)}
              data-testid={`calendar-day-${iso}`}
              className={cn(
                "relative mx-auto flex size-9 items-center justify-center rounded-[10px] text-xs transition-[background-color,transform] duration-150",
                !inMonth && "text-ink-3/40",
                inMonth && !evs && !isToday && "text-ink-2 hover:bg-pill",
                evs && !isToday && (iso < today ? "bg-lilac font-bold text-ink hover:scale-105" : "bg-pink font-bold text-ink hover:scale-105"),
                isToday && "bg-ink font-bold text-white",
                selected === iso && "ring-2 ring-ink ring-offset-1",
              )}
            >
              {d.date()}
              {evs && isToday && <span className="absolute bottom-1 size-1 rounded-full bg-butter" />}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-3">
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded bg-ink" /> Hari ini</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded bg-pink" /> Event mendatang</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded bg-lilac" /> Event selesai</span>
      </div>
      {selected && (
        <div className="mt-4 space-y-2 border-t border-black/[0.06] pt-4 animate-fade-up" data-testid="calendar-selected-events">
          <p className="label-xs">{fmt(selected, "dddd, D MMMM")}</p>
          {sel.map((e) => (
            <div key={e.id} className="rounded-2xl bg-canvas p-3">
              <p className="text-sm font-semibold text-ink">{e.title}</p>
              <p className="flex items-center gap-1 text-xs text-ink-3"><MapPin className="size-3" /> {fmt(e.start_time, "HH:mm")} · {e.location || "Lokasi menyusul"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
