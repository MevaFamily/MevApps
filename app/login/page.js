"use client";
import { useState, useContext, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { AppContext } from "@/components/AppProvider";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const router = useRouter();
  const { session } = useContext(AppContext);

  useEffect(() => {
    if (session) {
      router.replace("/transaksi");
    }
  }, [session, router]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("mevapps_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    
    let emailTrimmed = email.trim();
    if (emailTrimmed && !emailTrimmed.includes("@")) {
      emailTrimmed = `${emailTrimmed}@meva.com`;
    }

    setLoadingLogin(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password: password
      });
      if (error) {
        setErrorMsg("Email atau password salah.");
      } else {
        if (rememberMe) {
          localStorage.setItem("mevapps_remembered_email", emailTrimmed);
        } else {
          localStorage.removeItem("mevapps_remembered_email");
        }
        router.replace("/transaksi");
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan jaringan.");
      console.error(err);
    } finally {
      setLoadingLogin(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-neutral-100 p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">MevApps</h1>
          <p className="text-sm text-neutral-400 mt-2">Masuk ke Hub Keuangan Rumah</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {errorMsg && (
            <div className="bg-rose-50 text-rose-600 text-xs font-medium p-3.5 rounded-xl border border-rose-100">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Username / Email</label>
            <input
              type="text"
              required
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3.5 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ivan atau ivan@meva.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl pl-4 pr-12 py-3.5 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pb-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-neutral-200 text-neutral-900 focus:ring-neutral-900 accent-neutral-900"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="text-xs text-neutral-500 font-medium">Ingat Saya</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loadingLogin}
            className="w-full bg-neutral-950 text-white font-semibold rounded-xl py-4 hover:bg-neutral-800 transition-colors text-sm flex justify-center items-center gap-2 disabled:opacity-75"
          >
            {loadingLogin ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Memproses...
              </>
            ) : (
              "Masuk"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
