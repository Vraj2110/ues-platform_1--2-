"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="px-3 pt-5 pb-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-mint-300 px-2 mb-1.5">
        {label}
      </p>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer",
            "text-sm font-medium transition-all duration-200 no-underline mb-0.5",
            pathname === item.href || pathname.startsWith(item.href + "/")
              ? "bg-cyan-mid text-cyan-ues"
              : "text-mint-700 hover:bg-cyan-light hover:text-[var(--color-mint)]"
          )}
        >
          <span className="w-5 text-center text-base leading-none">{item.icon}</span>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className="bg-pink-ues text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto">
              {item.badge}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[240px] z-50 flex flex-col bg-teal-deep border-r border-cyan-border/10 overflow-y-auto">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 px-5 py-6 font-display font-extrabold text-lg border-b border-cyan-border/8 text-[var(--color-mint)] no-underline"
      >
        <span className="w-2 h-2 rounded-full bg-pink-ues flex-shrink-0" />
        UES<span className="text-cyan-ues">Platform</span>
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
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-mint-700 hover:bg-cyan-light hover:text-[var(--color-mint)] transition-all duration-200 no-underline mb-0.5"
        >
          <span className="w-5 text-center">👤</span>
          Profile
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-pink-ues/70 hover:bg-pink-light hover:text-pink-ues transition-all duration-200 no-underline mb-3"
        >
          <span className="w-5 text-center">🚪</span>
          Logout
        </Link>

        {/* User pill */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-teal-card/60 cursor-pointer hover:bg-teal-card transition-colors duration-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-ues to-teal-DEFAULT flex items-center justify-center font-display font-bold text-sm text-teal-dark flex-shrink-0">
            AK
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-mint)] leading-tight">Aditya K.</p>
            <p className="text-[11px] text-mint-700">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
