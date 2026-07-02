import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Contact" };

const CONTACT_METHODS = [
  { icon: "✉️", bg: "bg-cyan-mid", label: "Email", value: "hello@uesplatform.io" },
  { icon: "📖", bg: "bg-pink-light", label: "Documentation", value: "docs.uesplatform.io" },
  { icon: "💬", bg: "bg-teal-surface border border-cyan-border/20", label: "Discord", value: "discord.gg/uesplatform" },
];

export default function ContactPage() {
  return (
    <section className="min-h-[calc(100vh-68px)] py-20 px-[6vw]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Left */}
        <div>
          <p className="section-label">Contact</p>
          <h1 className="font-display font-extrabold text-[clamp(2rem,4vw,3rem)] tracking-tight leading-tight mb-4">
            Get in touch
          </h1>
          <p className="text-mint-700 leading-relaxed mb-10">
            Have questions about UES Platform, the research methodology, or enterprise pricing? We'd love to hear from you.
          </p>
          <div className="flex flex-col gap-4">
            {CONTACT_METHODS.map((m) => (
              <div key={m.label} className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${m.bg}`}>
                  {m.icon}
                </div>
                <div>
                  <p className="text-xs text-mint-700">{m.label}</p>
                  <p className="text-sm font-medium">{m.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form */}
        <Card>
          <h2 className="font-display font-bold text-lg mb-1">Send a message</h2>
          <p className="text-sm text-mint-700 mb-6">We'll get back to you within 24 hours.</p>
          <form className="flex flex-col gap-4">
            <Input label="Full Name" placeholder="Your name" type="text" />
            <Input label="Email" placeholder="you@example.com" type="email" />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-mint-700">Topic</label>
              <select className="ues-select">
                <option>General inquiry</option>
                <option>Enterprise pricing</option>
                <option>Research / methodology</option>
                <option>Bug report</option>
                <option>Partnership</option>
              </select>
            </div>
            <Textarea label="Message" placeholder="Tell us about your use case..." rows={4} />
            <Button variant="primary" size="lg" type="submit" className="w-full">
              Send Message
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}
