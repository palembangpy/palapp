import QRCode from "qrcode";
import { fmt, roleOf } from "@/lib/format";
import type { User } from "@/lib/types";

// ISO/IEC 7810 ID-1: 85.6 × 54 mm, rendered at 300 dpi.
export const CARD_MM = { w: 85.6, h: 54 };
const W = 1011;
const H = 638;
const FONT = "'Plus Jakarta Sans Variable', sans-serif";
const MONO = "'JetBrains Mono Variable', monospace";
const C = { ink: "#101828", mint: "#D6E7E4", pink: "#FFD6E8", butter: "#FFE9A0", lilac: "#D9D0FF", grey: "#475467" };
const ROLE_BG: Record<string, string> = { Admin: C.ink, Staff: C.lilac, Member: "#FFFFFF" };

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // needed so the canvas stays exportable
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

export async function renderIdCard(u: User): Promise<string> {
  await document.fonts.ready;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  const role = roleOf(u);

  // base + decorative blobs
  ctx.fillStyle = C.mint;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(W - 90, 40, 210, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(217,208,255,0.6)";
  ctx.beginPath();
  ctx.arc(250, H - 120, 120, 0, Math.PI * 2);
  ctx.fill();

  // header: logo + brand
  const logo = await loadImg("/logo.png");
  ctx.save();
  rr(ctx, 56, 48, 76, 76, 20);
  ctx.clip();
  ctx.drawImage(logo, 56, 48, 76, 76);
  ctx.restore();
  ctx.fillStyle = C.ink;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText("PalembangPy", 152, 84);
  ctx.fillStyle = C.grey;
  ctx.font = `600 17px ${FONT}`;
  ctx.fillText("MEMBER CARD · WONG KITO DEV", 153, 112);

  // role pill
  ctx.font = `700 22px ${FONT}`;
  const pw = ctx.measureText(role).width + 44;
  ctx.fillStyle = ROLE_BG[role];
  rr(ctx, W - 56 - pw, 60, pw, 48, 24);
  ctx.fill();
  ctx.fillStyle = role === "Admin" ? "#FFFFFF" : C.ink;
  ctx.fillText(role, W - 56 - pw + 22, 92);

  // avatar (falls back to initials when the image host blocks CORS)
  const ax = 56, ay = 160, as = 196;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax + as / 2, ay + as / 2, as / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = C.pink;
  ctx.fill();
  ctx.clip();
  let drew = false;
  if (u.avatar_url) {
    try {
      const img = await loadImage(u.avatar_url);
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, ax, ay, as, as);
      drew = true;
    } catch {
      /* fall back to initials */
    }
  }
  if (!drew) {
    ctx.fillStyle = C.ink;
    ctx.font = `700 72px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(u.name.split(" ").slice(0, 2).map((s) => s[0]?.toUpperCase()).join(""), ax + as / 2, ay + as / 2 + 4);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(ax + as / 2, ay + as / 2, as / 2 + 2, 0, Math.PI * 2);
  ctx.stroke();

  // identity
  const tx = 290, maxW = W - tx - 300;
  ctx.fillStyle = C.ink;
  ctx.font = `800 54px ${FONT}`;
  ctx.fillText(fitText(ctx, u.name, maxW), tx, 238);
  ctx.fillStyle = C.grey;
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText(fitText(ctx, u.username ? `@${u.username}` : u.bio || "Pythonista Palembang", maxW), tx, 280);
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText(`Bergabung ${fmt(u.created_at, "DD/MM/YYYY")}  ·  ${u.points ?? 0} poin`, tx, 326);

  // bottom strip
  ctx.fillStyle = C.ink;
  rr(ctx, 40, H - 196, W - 80, 156, 32);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `700 17px ${FONT}`;
  ctx.fillText("MEMBER ID", 84, H - 140);
  ctx.fillStyle = C.butter;
  ctx.font = `700 46px ${MONO}`;
  ctx.fillText(fitText(ctx, u.member_code, W - 420), 84, H - 86);

  // QR (white tile overlapping strip)
  const qs = 236, qx = W - 56 - qs, qy = H - 56 - qs - 30;
  ctx.fillStyle = "#FFFFFF";
  rr(ctx, qx - 14, qy - 14, qs + 28, qs + 28, 28);
  ctx.fill();
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, u.member_code, { width: qs, margin: 0, color: { dark: C.ink, light: "#FFFFFF" } });
  ctx.drawImage(qr, qx, qy, qs, qs);

  return cv.toDataURL("image/png");
}

const fileBase = (u: User) => `kartu-${u.member_code}-${u.name.replace(/\s+/g, "_")}`;

export async function downloadIdCardPng(u: User) {
  const a = document.createElement("a");
  a.href = await renderIdCard(u);
  a.download = `${fileBase(u)}.png`;
  a.click();
}

export async function downloadIdCardPdf(u: User) {
  const [{ jsPDF }, png] = await Promise.all([import("jspdf"), renderIdCard(u)]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [CARD_MM.w, CARD_MM.h] });
  pdf.addImage(png, "PNG", 0, 0, CARD_MM.w, CARD_MM.h);
  pdf.save(`${fileBase(u)}.pdf`);
}

export async function printIdCard(u: User) {
  const png = await renderIdCard(u);
  const w = window.open("", "_blank", "width=600,height=420");
  if (!w) throw new Error("popup-blocked");
  w.document.write(
    `<html><head><title>${fileBase(u)}</title><style>@page{size:${CARD_MM.w}mm ${CARD_MM.h}mm;margin:0}html,body{margin:0}img{width:${CARD_MM.w}mm;height:${CARD_MM.h}mm;display:block}</style></head>` +
      `<body><img src="${png}" onload="setTimeout(()=>{window.print();window.close()},150)"/></body></html>`,
  );
  w.document.close();
}
