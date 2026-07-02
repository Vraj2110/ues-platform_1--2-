"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function PublicNavbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[6vw] h-[68px] bg-[rgba(15,50,56,0.85)] backdrop-blur-xl border-b border-cyan-border/12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 font-display font-extrabold text-xl tracking-tight no-underline text-[var(--color-mint)]">
        <span className="w-2 h-2 rounded-full bg-pink-ues flex-shrink-0" />
        UES<span className="text-cyan-ues">Platform</span>
      </Link>

      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm font-medium transition-colors duration-200 no-underline",
              pathname === link.href
                ? "text-[var(--color-mint)]"
                : "text-mint-700 hover:text-[var(--color-mint)]"
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-3">
        <Link href="/login">
          <Button variant="outline" size="sm">Login</Button>
        </Link>
        <Link href="/signup">
          <Button variant="primary" size="sm">Get Started</Button>
        </Link>
      </div>
    </nav>
  );
}
