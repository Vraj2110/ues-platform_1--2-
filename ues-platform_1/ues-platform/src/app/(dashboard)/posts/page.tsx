"use client";
import type { Metadata } from "next";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PostRow } from "@/components/dashboard/PostRow";
import { POSTS } from "@/lib/data";

const PLATFORM_FILTERS = [
  { label: "All", value: "all" },
  { label: "Instagram", value: "instagram" },
  { label: "YouTube", value: "youtube" },
  { label: "X / Twitter", value: "twitter" },
  { label: "LinkedIn", value: "linkedin" },
];


export default function PostsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const filteredPosts =
    selectedPlatform === "all"
      ? POSTS
      : POSTS.filter((post) => post.platform === selectedPlatform);

  return (
    <div className="page-enter">
      <PageHeader
        title="Posts / Content"
        subtitle="All tracked posts across connected platforms"
        action={
          <Link href="/posts/add">
            <Button variant="primary">+ Add Post</Button>
          </Link>
        }
      />
      <div className="px-9 pb-9">
        {/* Filters bar */}
        <div className="flex items-center gap-3 mb-5">
          {PLATFORM_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelectedPlatform(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                selectedPlatform === f.value
                  ? "bg-cyan-mid text-cyan-ues"
                  : "bg-teal-card/50 text-mint-700 hover:bg-teal-card hover:text-[var(--color-mint)] border border-cyan-border/8"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto">
            <select className="ues-select text-sm py-2">
              <option>Newest first</option>
              <option>Highest UES</option>
              <option>Lowest UES</option>
            </select>
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-border/10">
                  <th className="text-left px-4 py-3.5 text-[10px] uppercase tracking-widest text-mint-700 font-semibold">Platform</th>
                  <th className="text-left px-4 py-3.5 text-[10px] uppercase tracking-widest text-mint-700 font-semibold">Post</th>
                  <th className="text-left px-4 py-3.5 text-[10px] uppercase tracking-widest text-mint-700 font-semibold">Date</th>
                  <th className="text-left px-4 py-3.5 text-[10px] uppercase tracking-widest text-mint-700 font-semibold">Type</th>
                  <th className="text-left px-4 py-3.5 text-[10px] uppercase tracking-widest text-mint-700 font-semibold">Views</th>
                  <th className="text-left px-4 py-3.5 text-[10px] uppercase tracking-widest text-mint-700 font-semibold">UES</th>
                  <th className="text-left px-4 py-3.5 text-[10px] uppercase tracking-widest text-mint-700 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
