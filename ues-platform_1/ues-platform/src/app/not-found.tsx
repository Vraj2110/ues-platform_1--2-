import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-[#0b1319]">
      <div className="max-w-md rounded-2xl border border-cyan-border/20 bg-teal-surface p-8 shadow-2xl">
        <div className="mb-4 text-5xl">🔍</div>
        <h1 className="text-3xl font-bold font-display text-cyan-ues mb-2">404</h1>
        <h2 className="text-lg font-semibold text-[#e0f2fe] mb-2">Page Not Found</h2>
        <p className="text-sm text-mint-700 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="primary">Go to Dashboard</Button>
          </Link>
          <Link href="/posts">
            <Button variant="outline">View Posts</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
