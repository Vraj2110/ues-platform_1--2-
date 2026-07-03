
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthLeftPanel } from "@/components/layout/AuthLeftPanel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [org, setOrg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.replace("/dashboard");
      }
    });

    return unsubscribe;
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (!firstName || !lastName) {
      setError("Please enter your first and last name.");
      setLoading(false);
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (userCredential.user && fullName) {
        await updateProfile(userCredential.user, { displayName: fullName });
      }
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError(err.message || "Signup failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthLeftPanel
        heading="Start measuring engagement the right way"
        subtext="Join brands and influencers who've moved beyond raw metrics. Get your first Unified Engagement Score in minutes."
        bullets={[
          "Free 14-day trial, no credit card required",
          "Connect up to 3 platforms instantly",
          "AI insights from day one",
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

          <h1 className="font-display font-bold text-[1.9rem] tracking-tight mb-1">Create Account</h1>
          <p className="text-sm text-mint-700 mb-8">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan-ues hover:underline no-underline">
              Sign in
            </Link>
          </p>

          <form className="flex flex-col gap-4 relative" onSubmit={handleSignup}>
            {loading && (
              <div className="absolute inset-0 bg-teal-dark/50 flex items-center justify-center z-10">
                <div className="text-cyan-ues text-lg">⏳</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                placeholder="First"
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                error={error && error.toLowerCase().includes("first") ? error : undefined}
              />
              <Input
                label="Last Name"
                placeholder="Last"
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                error={error && error.toLowerCase().includes("last") ? error : undefined}
              />
            </div>
            <Input
              label="Email address"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              error={error && error.toLowerCase().includes("email") ? error : undefined}
              autoComplete="email"
            />
            <Input
              label="Organization / Brand"
              placeholder="Your brand or company"
              type="text"
              value={org}
              onChange={e => setOrg(e.target.value)}
            />
            <Input
              label="Password"
              placeholder="Min. 8 characters"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              error={error && error.toLowerCase().includes("password") ? error : undefined}
              autoComplete="new-password"
              className="pr-14"
              rightAdornment={
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(v => !v)}
                  className="flex h-10 w-10 items-center justify-center text-mint-300 cursor-pointer transition-colors duration-200 hover:text-mint-100 focus:outline-none focus:ring-2 focus:ring-cyan-ues/30 rounded"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-5 w-5 transition-opacity duration-200 ${showPassword ? "opacity-0" : "opacity-100"}`}
                  >
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-5 w-5 transition-opacity duration-200 ${showPassword ? "opacity-100" : "opacity-0"}`}
                  >
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.7 18.7 0 0 1 5-5.94" />
                    <path d="M1 1l22 22" />
                  </svg>
                </button>
              }
            />
            {error && !error.toLowerCase().includes("first") && !error.toLowerCase().includes("last") && !error.toLowerCase().includes("email") && !error.toLowerCase().includes("password") && (
              <div className="text-xs text-pink-ues text-center">{error}</div>
            )}
            <Button
              variant="pink"
              size="lg"
              className="w-full mt-1"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Free Account →"}
            </Button>
            <p className="text-xs text-mint-700 text-center">
              By signing up you agree to our{" "}
              <span className="text-cyan-ues cursor-pointer">Terms of Service</span> and{" "}
              <span className="text-cyan-ues cursor-pointer">Privacy Policy</span>.
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
