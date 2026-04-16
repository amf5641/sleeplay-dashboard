"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      totpCode: needs2fa ? totpCode : "",
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      if (res.error === "2FA_REQUIRED") {
        setNeeds2fa(true);
        setError("");
      } else if (res.error === "CredentialsSignin") {
        setError("Invalid email or password.");
      } else {
        setError(res.error);
      }
    } else {
      router.push("/");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ultra-violet">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex justify-center">
          <Image src="/sleeplay-logo.svg" alt="Sleeplay" width={160} height={48} priority />
        </div>

        <h1 className="mb-6 text-center font-heading text-2xl font-bold text-ultra-violet">
          {needs2fa ? "Two-Factor Authentication" : "Sign in to your account"}
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!needs2fa ? (
            <>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-brand-black">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-platinum px-4 py-2.5 text-sm text-brand-black outline-none transition focus:border-royal-purple focus:ring-2 focus:ring-royal-purple/20"
                  placeholder="you@sleeplay.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-brand-black">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-platinum px-4 py-2.5 text-sm text-brand-black outline-none transition focus:border-royal-purple focus:ring-2 focus:ring-royal-purple/20"
                  placeholder="Enter your password"
                />
              </div>
            </>
          ) : (
            <div>
              <p className="mb-3 text-sm text-brand-gray text-center">
                Enter the 6-digit code from your authenticator app
              </p>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-platinum px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-brand-black outline-none transition focus:border-royal-purple focus:ring-2 focus:ring-royal-purple/20"
                placeholder="000000"
                autoFocus
              />
              <p className="mt-2 text-xs text-brand-gray text-center">
                Or enter a recovery code
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-midnight-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-royal-purple disabled:opacity-50"
          >
            {loading ? "Verifying..." : needs2fa ? "Verify" : "Sign In"}
          </button>
        </form>

        {needs2fa ? (
          <div className="mt-4 text-center">
            <button
              onClick={() => { setNeeds2fa(false); setTotpCode(""); setError(""); }}
              className="text-sm text-royal-purple hover:underline"
            >
              Back to login
            </button>
          </div>
        ) : (
          <div className="mt-4 text-center">
            <Link href="/login/forgot" className="text-sm text-royal-purple hover:underline">
              Forgot Password?
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
