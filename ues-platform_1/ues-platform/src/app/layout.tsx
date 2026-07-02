import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "UES Platform — Unified Engagement Scoring",
    template: "%s | UES Platform",
  },
  description:
    "Cross-platform social media engagement analytics with normalized scoring. One unified score across Instagram, YouTube, X, LinkedIn and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
