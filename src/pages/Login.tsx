import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Alert, Button, Form, Input } from "antd";
import { ArrowRight, Eye, KeyRound, Send, UserRound } from "lucide-react";
import { Logo } from "@/components/AppShell";
import { errMsg, session } from "@/lib/http";
import { enterGuest, login, loginWithTelegram, telegramInitData } from "@/lib/queries";

const BOT_URL = import.meta.env.VITE_TELEGRAM_BOT_URL as string | undefined;

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [authFailed, setAuthFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const initData = telegramInitData();
  const tgTried = useRef(false);

  const tgLogin = async () => {
    setPending(true);
    setError(null);
    try {
      await loginWithTelegram(initData);
      navigate("/", { replace: true });
    } catch (e) {
      setError(`Login Telegram gagal: ${errMsg(e)}`);
    } finally {
      setPending(false);
    }
  };
  // Opened as a Telegram Mini App → sign in automatically once.
  useEffect(() => {
    if (initData && !session.token() && !tgTried.current) {
      tgTried.current = true;
      void tgLogin();
    }
  }, [initData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (session.token()) return <Navigate to="/" replace />;

  const submit = async (v: { username: string; password: string }) => {
    setPending(true);
    setError(null);
    setAuthFailed(false);
    try {
      await login(v.username.trim(), v.password);
      navigate("/", { replace: true });
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        setAuthFailed(true);
        setError("Username/Telegram ID atau password ditolak oleh server API (401). Akun ini belum memiliki password yang valid di server.");
      } else setError(errMsg(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-shell p-2 sm:p-4 lg:p-5" data-testid="login-page">
      <div className="grid min-h-[calc(100vh-1rem)] grid-cols-1 gap-3 rounded-[32px] bg-white p-2 sm:min-h-[calc(100vh-2rem)] sm:p-3 lg:grid-cols-2">
        <section className="relative hidden overflow-hidden rounded-[28px] bg-mint p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-20 -top-20 size-80 rounded-full bg-white/30" aria-hidden />
          <div className="relative flex items-center gap-3">
            <Logo size="lg" />
            <div>
              <p className="text-xl font-bold tracking-tight">PalembangPy</p>
              <p className="text-sm text-ink-2">Komunitas Python Wong Kito</p>
            </div>
          </div>
          <img src="/hero-dev.jpg" alt="Developer PalembangPy" className="relative mx-auto w-[78%] max-w-md [mask-image:radial-gradient(closest-side,#000_72%,transparent)] animate-float" />
          <div className="relative grid grid-cols-3 gap-3">
            {[["Member", "bg-white"], ["Event", "bg-pink"], ["Sertifikat", "bg-butter"]].map(([l, c]) => (
              <div key={l} className={`rounded-2xl p-4 ${c}`}>
                <p className="label-xs">Kelola</p>
                <p className="mt-1 font-semibold">{l}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center rounded-[28px] bg-canvas p-6 sm:p-10">
          <div className="w-full max-w-sm animate-fade-up">
            <div className="mb-8 lg:hidden"><Logo size="lg" /></div>
            <p className="label-xs">Dashboard Admin · Member · Speaker</p>
            <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight" data-testid="login-title">Masuk ke PalembangPy</h1>
            <p className="mt-2 text-sm text-ink-2">Masuk dengan username / Telegram ID & password akun PalembangPy-mu. Dashboard menyesuaikan peranmu (Admin, Speaker, atau Member).</p>

            {params.get("expired") && <Alert className="mt-5 rounded-2xl" type="warning" showIcon title="Sesi berakhir, silakan masuk lagi." data-testid="login-expired-alert" />}
            {error && <Alert className="mt-5 rounded-2xl" type="error" showIcon title={error} data-testid="login-error-alert" />}

            {authFailed && (
              <div className="mt-3 rounded-2xl border border-black/5 bg-white p-4 text-sm animate-fade-up" data-testid="login-telegram-guide">
                <p className="flex items-center gap-2 font-semibold"><Send className="size-4" /> Login lewat bot Telegram</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
                  <li>Buka bot Telegram PalembangPy dengan akun yang terdaftar.</li>
                  <li>Kirim <code className="rounded bg-canvas px-1">/start</code> agar akunmu tersinkron dengan Telegram ID.</li>
                  <li>Tekan tombol <b>Mini App / Dashboard</b> di bot — dashboard terbuka dan login otomatis tanpa password.</li>
                  <li>Atau minta admin server untuk mereset password akunmu, lalu coba lagi di sini.</li>
                </ol>
                {BOT_URL && (
                  <Button href={BOT_URL} target="_blank" block shape="round" className="mt-3" icon={<Send className="size-4" />} data-testid="login-open-bot-button">Buka bot Telegram</Button>
                )}
              </div>
            )}

            <Form layout="vertical" onFinish={submit} requiredMark={false} className="mt-6" data-testid="login-form">
              <Form.Item name="username" label="Username / Telegram ID" rules={[{ required: true, message: "Wajib diisi" }]}>
                <Input size="large" prefix={<UserRound className="size-4 text-ink-3" />} placeholder="pytoms" autoComplete="username" data-testid="login-username-input" className="rounded-2xl" />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true, message: "Wajib diisi" }]}>
                <Input.Password size="large" prefix={<KeyRound className="size-4 text-ink-3" />} placeholder="••••••••" autoComplete="current-password" data-testid="login-password-input" className="rounded-2xl" />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block shape="round" loading={pending} data-testid="login-submit-button" icon={<ArrowRight className="size-4" />} iconPlacement="end">
                Masuk
              </Button>
            </Form>

            {initData && (
              <Button size="large" block shape="round" className="mt-3" icon={<Send className="size-4" />} loading={pending} onClick={tgLogin} data-testid="login-telegram-button">Masuk dengan Telegram</Button>
            )}
            {!initData && <p className="mt-3 text-center text-xs text-ink-3" data-testid="login-telegram-hint">Punya akun dari bot Telegram? Buka dashboard ini lewat tombol Mini App di bot untuk login otomatis.</p>}

            <div className="my-6 flex items-center gap-3 text-xs text-ink-3"><span className="h-px flex-1 bg-black/10" /> atau <span className="h-px flex-1 bg-black/10" /></div>
            <Button size="large" block shape="round" onClick={() => { enterGuest(); navigate("/"); }} icon={<Eye className="size-4" />} data-testid="login-guest-button">
              Lihat data publik (mode tamu)
            </Button>
            <p className="mt-3 text-center text-xs text-ink-3">Mode tamu hanya menampilkan event, speaker, partner, project & verifikasi sertifikat.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
