
"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { UES_SCORE, POSTS, CONNECTED_PLATFORMS } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firestore";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";

// Removed metadata export because it's not allowed in a 'use client' component


const PROFILE_STATS = [
  { label: "Avg UES", value: UES_SCORE.overall, color: "text-cyan-ues" },
  { label: "Total Posts", value: POSTS.length, color: "text-[var(--color-mint)]" },
  { label: "Platforms", value: CONNECTED_PLATFORMS.length, color: "text-cyan-ues" },
];

const TABS = ["Account", "Notifications", "API Keys", "Team"];

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      (async () => {
        if (!u) {
          setFirstName("");
          setLastName("");
          setEditing(false);
          return;
        }
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          const storedName = userDoc.exists() ? (userDoc.data() as any).displayName || (userDoc.data() as any).name : null;
          const resolvedName = storedName || u.displayName || "";
          if (resolvedName && u.displayName !== resolvedName) {
            try {
              await updateProfile(u, { displayName: resolvedName });
            } catch (e) {
              // ignore updateProfile failures here
            }
          }
          const nameParts = (resolvedName || "").split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
          setEditing(!resolvedName);
        } catch (e) {
          const nameParts = (u?.displayName || "").split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
          setEditing(!u?.displayName);
        }
      })();
    });
    return () => unsubscribe();
  }, []);

  const displayName = user?.displayName || user?.email?.split("@")[0] || "username";
  const email = user?.email || "";
  const avatarInitials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSaveName = async () => {
    if (!user) return;
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName) {
      setError("Name cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const current = auth.currentUser;
      if (!current) throw new Error("No authenticated user");
      await updateProfile(current, { displayName: fullName });
      // refresh user reference
      const updatedUser = auth.currentUser;
      setUser(updatedUser);
      setEditing(false);
      // persist to firestore
      try {
        await setDoc(doc(db, "users", current.uid), {
          displayName: fullName,
          email: current.email || null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (writeErr) {
        console.warn("Failed to persist profile to Firestore", writeErr);
      }
      // show saved state and reload so user sees updated info
      setSaved(true);
      setSaving(false);
      setTimeout(() => {
        try {
          window.location.reload();
        } catch (e) {
          // ignore
        }
      }, 700);
    } catch (e: any) {
      setError(e.message || "Failed to update name.");
    } finally {
      if (!saved) setSaving(false);
    }
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Profile"
        subtitle="Manage your account, preferences, and subscription"
      />

      <div className="px-9 pb-9 grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
        {/* Profile card */}
        <div className="space-y-5">
          <Card className="text-center py-8">
            {/* Avatar */}
            <div className="w-[88px] h-[88px] rounded-full bg-gradient-to-br from-cyan-ues to-teal-DEFAULT flex items-center justify-center font-display font-extrabold text-3xl text-teal-dark mx-auto mb-4 border-[3px] border-cyan-border/30">
              {avatarInitials}
            </div>
            <h2 className="font-display font-bold text-xl">{displayName}</h2>
            {error && <div className="text-xs text-pink-ues mt-1">{error}</div>}
            <p className="text-sm text-mint-700 mt-1">{email}</p>
            <div className="inline-flex items-center gap-1.5 mt-3 bg-pink-light text-pink-ues text-xs font-semibold px-3 py-1.5 rounded-full">
               Pro Plan
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              {PROFILE_STATS.map((s) => (
                <div key={s.label} className="bg-teal-surface rounded-xl p-3">
                  <p className={`font-display font-extrabold text-2xl leading-none ${s.color}`}>
                    {s.value}
                  </p>
                  <p className="text-[10px] text-mint-700 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Subscription */}
          <Card>
            <CardTitle>Subscription</CardTitle>
            <div className="mt-4 p-4 bg-cyan-light/[0.04] border border-cyan-border/20 rounded-xl">
              <p className="font-display font-bold text-cyan-ues">Pro Plan</p>
              <p className="text-xs text-mint-700 mt-1 leading-relaxed">
                Up to 10 platforms · Unlimited posts · AI Analyst · Priority support
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-mint-700">Renews Apr 14, 2024</p>
                <button className="text-xs text-cyan-ues hover:underline">Manage →</button>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3">
              Upgrade to Enterprise
            </Button>
          </Card>
        </div>

        {/* Main settings area */}
        <div className="space-y-5">
          {/* Tab bar */}
          <div className="flex gap-1 bg-teal-surface rounded-xl p-1 w-fit">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                className={`px-5 py-2 rounded-lg text-sm font-display font-semibold transition-all duration-200 ${
                  i === 0
                    ? "bg-cyan-mid text-cyan-ues"
                    : "text-mint-700 hover:text-[var(--color-mint)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Account form */}
          <Card>
            <CardTitle>Account Settings</CardTitle>
            <CardSubtitle>Update your personal information</CardSubtitle>
            <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveName(); }}>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  type="text"
                />
                <Input
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  type="text"
                />
              </div>
              <Input label="Email address" value={email} type="email" readOnly />
              <Input label="Organization" placeholder="UES Research Lab" type="text" />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-mint-700">Timezone</label>
                <select className="ues-select">
                  <option>Asia/Kolkata (IST, UTC+5:30)</option>
                  <option>America/New_York (EST, UTC-5)</option>
                  <option>Europe/London (GMT, UTC+0)</option>
                  <option>Asia/Tokyo (JST, UTC+9)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="primary" type="submit" disabled={saving || saved}>
                  {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
                </Button>
                <Button variant="ghost" type="button">
                  Change Password
                </Button>
              </div>
            </form>
          </Card>

          {/* Danger zone */}
          <Card className="border-pink-ues/15">
            <CardTitle>Danger Zone</CardTitle>
            <CardSubtitle>Irreversible actions — proceed with caution</CardSubtitle>
            <div className="mt-5 flex items-center justify-between p-4 bg-pink-light/50 border border-pink-ues/15 rounded-xl">
              <div>
                <p className="text-sm font-medium text-pink-ues">Delete Account</p>
                <p className="text-xs text-mint-700 mt-0.5">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button variant="danger" size="sm">
                Delete
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
