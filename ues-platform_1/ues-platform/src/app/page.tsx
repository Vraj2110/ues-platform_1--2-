import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function RootPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Welcome to UES Platform</h1>
      <p className="text-lg text-gray-600 mb-8">Get started by signing up or logging in.</p>
      <div className="flex gap-4">
        <Link href="/signup">
          <Button variant="primary" size="lg">Sign Up</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" size="lg">Log In</Button>
        </Link>
      </div>
    </main>
  );
}
