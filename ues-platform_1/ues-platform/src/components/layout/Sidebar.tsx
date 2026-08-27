"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { 
  LayoutDashboard, 
  Link2, 
  FileText, 
  PlusCircle, 
  Award, 
  BarChart3, 
  Bot, 
  User, 
  LogOut 
} from "lucide-react";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

const PUBLIC_NAV: NavItem[] = [
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/connect", icon: "🔗", label: "Connect Platform" },
];

const CONTENT_NAV: NavItem[] = [
  { href: "/posts", icon: "📝", label: "Posts / Content" },
  { href: "/posts/add", icon: "✚", label: "Add Post" },
];

const SCORING_NAV: NavItem[] = [
  { href: "/score", icon: "⭐", label: "Engagement Score" },
  { href: "/analytics", icon: "📈", label: "Analytics" },
  { href: "/insights", icon: "🤖", label: "AI Insights", badge: 3 },
];

function SidebarIcon({ name, className }: { name: string; className?: string }) {
  const cnClass = className || "w-5 h-5 transition-transform duration-200 group-hover:scale-110";
  switch (name) {
    case "📊": return <LayoutDashboard className={cnClass} />;
    case "🔗": return <Link2 className={cnClass} />;
    case "📝": return <FileText className={cnClass} />;
    case "✚": return <PlusCircle className={cnClass} />;
    case "⭐": return <Award className={cnClass} />;
    case "📈": return <BarChart3 className={cnClass} />;
    case "🤖": return <Bot className={cnClass} />;
    case "👤": return <User className={cnClass} />;
    case "🚪": return <LogOut className={cnClass} />;
    default: return <span className="w-5 text-center">{name}</span>;
  }
}

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="px-3 pt-5 pb-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-mint-300/50 px-2 mb-1.5">
        {label}
      </p>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group no-underline mb-0.5",
            "text-sm font-medium transition-all duration-200",
            pathname ? (pathname === item.href || pathname.startsWith(item.href + "/")) : false
              ? "bg-cyan-mid text-cyan-ues shadow-sm shadow-cyan-mid/10"
              : "text-mint-700 hover:bg-cyan-light hover:text-[var(--color-mint)]"
          )}
        >
          <span className="w-5 flex items-center justify-center text-center">
            <SidebarIcon name={item.icon} />
          </span>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className="bg-pink-ues text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto shadow-sm shadow-pink-ues/15">
              {item.badge}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export function Sidebar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const profileName = user?.displayName || user?.email?.split("@")[0] || "User";
  const profileInitials = profileName
    .split(" ")
    .filter(Boolean)
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[240px] z-50 flex flex-col bg-teal-deep border-r border-cyan-border/10 overflow-y-auto">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2.5 px-5 py-6 font-display font-extrabold text-lg border-b border-cyan-border/8 text-[var(--color-mint)] no-underline group"
      >
        <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-tr from-pink-ues via-purple-600 to-cyan-ues rounded-xl shadow-lg shadow-pink-ues/20 flex-shrink-0">
          <span className="font-display font-black text-white text-base tracking-tighter">U</span>
          <div className="absolute -inset-0.5 bg-gradient-to-tr from-pink-ues to-cyan-ues rounded-xl blur-sm opacity-20 group-hover:opacity-60 transition duration-300"></div>
        </div>
        <span className="font-display font-extrabold text-[var(--color-mint)] tracking-tight">
          UES<span className="bg-gradient-to-r from-cyan-ues to-mint-300 bg-clip-text text-transparent font-medium ml-0.5">Platform</span>
        </span>
      </Link>

      {/* Navigation */}
      <NavSection label="Main" items={PUBLIC_NAV} />
      <NavSection label="Content" items={CONTENT_NAV} />
      <NavSection label="Scoring" items={SCORING_NAV} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section */}
      <div className="px-3 pb-4 border-t border-cyan-border/8 pt-3">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-mint-700 hover:bg-cyan-light hover:text-[var(--color-mint)] transition-all duration-200 no-underline mb-0.5 group"
        >
          <span className="w-5 flex items-center justify-center text-center">
            <SidebarIcon name="👤" />
          </span>
          Profile
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-pink-ues/70 hover:bg-pink-light hover:text-pink-ues transition-all duration-200 mb-3 group"
        >
          <span className="w-5 flex items-center justify-center text-center">
            <SidebarIcon name="🚪" className="w-5 h-5 text-pink-ues/70 group-hover:text-pink-ues group-hover:scale-110 transition-all duration-200" />
          </span>
          Logout
        </button>

        {/* User pill */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-teal-card/60 cursor-pointer hover:bg-teal-card transition-colors duration-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-ues to-teal-DEFAULT flex items-center justify-center font-display font-bold text-sm text-teal-dark flex-shrink-0">
            {profileInitials}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-mint)] leading-tight">{profileName}</p>
            <p className="text-[11px] text-mint-700">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
