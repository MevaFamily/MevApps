"use client";
import { useState, useContext, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { AppContext } from "@/components/AppProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const router = useRouter();
  const { session } = useContext(AppContext);

  useEffect(() => {
    if (session) {
      router.replace("/transaksi");
    }
  }, [session, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    
    const emailTrimmed = email.trim();
    if (!emailTrimmed.endsWith("@meva.com")) {
      setErrorMsg("Akses ditolak. Email harus menggunakan domain @meva.com");
      return;
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
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              required
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3.5 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@meva.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3.5 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loadingLogin}
            className="w-full bg-neutral-950 text-white font-semibold rounded-xl py-4 hover:bg-neutral-800 transition-colors mt-2 text-sm flex justify-center items-center gap-2 disabled:opacity-75"
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
