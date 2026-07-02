
"use client";
import type { Metadata } from "next";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { UES_SCORE, POSTS, CONNECTED_PLATFORMS } from "@/lib/data";
import { auth } from "@/lib/firebase";

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
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      const nameParts = (u?.displayName || u?.email?.split("@")[0] || "").split(" ");
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
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
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName) {
      setError("Name cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await user.updateProfile({ displayName: fullName });
      setEditing(false);
    } catch (e: any) {
      setError(e.message || "Failed to update name.");
    } finally {
      setSaving(false);
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
            <h2 className="font-display font-bold text-xl">
              {editing ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="First Name"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Last Name"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={saving}
                      onClick={handleSaveName}
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditing(false); const nameParts = displayName.split(" "); setFirstName(nameParts[0] || ""); setLastName(nameParts.slice(1).join(" ") || ""); setError(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {displayName}
                  {user && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-2"
                      onClick={() => setEditing(true)}
                    >
                      Change Username
                    </Button>
                  )}
                </>
              )}
            </h2>
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
            <form className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" defaultValue="Aditya" type="text" />
                <Input label="Last Name" defaultValue="Kumar" type="text" />
              </div>
              <Input label="Email address" defaultValue="aditya@example.com" type="email" />
              <Input label="Organization" defaultValue="UES Research Lab" type="text" />
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
                <Button variant="primary">Save Changes</Button>
                <Button variant="ghost">Change Password</Button>
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
