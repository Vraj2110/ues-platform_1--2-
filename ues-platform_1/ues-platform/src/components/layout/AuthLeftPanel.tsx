import Link from "next/link";

interface AuthLeftPanelProps {
  heading: string;
  subtext: string;
  bullets: string[];
}

export function AuthLeftPanel({ heading, subtext, bullets }: AuthLeftPanelProps) {
  return (
    <div className="relative hidden lg:flex flex-col justify-center px-16 py-20 bg-auth-left overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute w-[400px] h-[400px] rounded-full border border-cyan-border/12 -top-24 -right-24 pointer-events-none" />
      <div className="absolute w-[240px] h-[240px] rounded-full border border-pink-ues/10 bottom-16 -left-16 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-ues/[0.03] blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-extrabold text-xl text-[var(--color-mint)] no-underline mb-10"
        >
          <span className="w-2 h-2 rounded-full bg-pink-ues" />
          UES<span className="text-cyan-ues">Platform</span>
        </Link>

        <h2 className="font-display font-extrabold text-[2.2rem] leading-[1.1] tracking-tight mb-4 max-w-[380px]">
          {heading}
        </h2>
        <p className="text-mint-700 leading-relaxed mb-8 max-w-[380px]">{subtext}</p>

        <div className="flex flex-col gap-3">
          {bullets.map((b) => (
            <div key={b} className="flex items-start gap-2.5 text-sm">
              <span className="text-cyan-ues font-bold mt-0.5">✓</span>
              <span className="text-mint-700">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
