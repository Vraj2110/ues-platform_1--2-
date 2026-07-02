import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="bg-[rgba(10,35,40,0.9)] border-t border-cyan-border/10 py-10 px-[6vw]">
      <div className="flex flex-col md:flex-row justify-between items-center gap-5">
        <Link href="/" className="flex items-center gap-2 font-display font-extrabold text-lg text-[var(--color-mint)] no-underline">
          <span className="w-2 h-2 rounded-full bg-pink-ues" />
          UES<span className="text-cyan-ues">Platform</span>
        </Link>
        <p className="text-xs text-mint-700">© 2024 UESPlatform · Unified Engagement Scoring SaaS</p>
        <div className="flex items-center gap-6">
          {[
            { href: "/features", label: "Features" },
            { href: "/about", label: "About" },
            { href: "/contact", label: "Contact" },
            { href: "/login", label: "Login" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-mint-700 hover:text-cyan-ues no-underline transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
