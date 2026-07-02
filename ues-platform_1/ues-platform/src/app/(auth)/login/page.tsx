"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLeftPanel } from "@/components/layout/AuthLeftPanel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

import { useState } from "react";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError(err.message || "Login failed.");
      }
    } finally {
      setLoading(false);
    }

  };

  const handleSocialLogin = async (provider: "google" | "github") => {
    setError("");
    setLoading(true);
    try {
      const prov = provider === "google" ? googleProvider : githubProvider;
      await signInWithPopup(auth, prov);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || `Login with ${provider} failed.`);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setResetSent(false);
    if (!email) {
      setError("Enter your email above to reset password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    }
  };

  return (
    <>
      <AuthLeftPanel
        heading="Welcome back to your analytics hub"
        subtext="Log in to access your unified engagement scores, AI-powered insights, and cross-platform analytics dashboard."
        bullets={[
          "Unified Engagement Score across all platforms",
          "AI Analyst explains every score change",
          "Deterministic, auditable scoring engine",
        ]}
      />

      {/* Right panel */}
      <div className="flex items-center justify-center px-8 py-16 bg-teal-dark">
        <div className="w-full max-w-[420px]">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-mint-700 hover:text-cyan-ues no-underline transition-colors duration-200 mb-7"
          >
            ← Back
          </button>

          <h1 className="font-display font-bold text-[1.9rem] tracking-tight mb-1">Sign In</h1>
          <p className="text-sm text-mint-700 mb-8">
            Don't have an account?{" "}
            <Link href="/signup" className="text-cyan-ues hover:underline no-underline">
              Create one free
            </Link>
          </p>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              onClick={() => handleSocialLogin("google")}
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-border bg-teal-card/30 text-sm text-mint-700 hover:border-cyan-ues hover:text-[var(--color-mint)] hover:bg-cyan-light transition-all duration-200"
              disabled={loading}
            >
              <span role="img" aria-label="Google">🔵</span> Google
            </button>
            <button
              onClick={() => handleSocialLogin("github")}
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-border bg-teal-card/30 text-sm text-mint-700 hover:border-cyan-ues hover:text-[var(--color-mint)] hover:bg-cyan-light transition-all duration-200"
              disabled={loading}
            >
              <span role="img" aria-label="GitHub">⬛</span> GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative text-center my-5">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-border/15" />
            <span className="relative bg-teal-dark px-3 text-xs text-mint-700">or continue with email</span>
          </div>

          <form className="flex flex-col gap-4 relative" onSubmit={handleLogin}>
            {loading && (
              <div className="absolute inset-0 bg-teal-dark/50 flex items-center justify-center z-10">
                <div className="text-cyan-ues text-lg">⏳</div>
              </div>
            )}
            <Input
              label="Email address"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              error={error && error.toLowerCase().includes("email") ? error : undefined}
              autoComplete="email"
            />
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <Input
                  label="Password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  error={error && error.toLowerCase().includes("password") ? error : undefined}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-ues hover:text-cyan-ues/80 bg-transparent border-none p-1 rounded"
                  onClick={() => setShowPassword(v => !v)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-cyan-ues hover:underline"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            </div>
            {error && !error.toLowerCase().includes("email") && !error.toLowerCase().includes("password") && (
              <div className="text-xs text-pink-ues text-center">{error}</div>
            )}
            {resetSent && (
              <div className="text-xs text-green-600 text-center">Password reset email sent!</div>
            )}
            <Button
              variant="primary"
              size="lg"
              className="w-full mt-1"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In →"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
