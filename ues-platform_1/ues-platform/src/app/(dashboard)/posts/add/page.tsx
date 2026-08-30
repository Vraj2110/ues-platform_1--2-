"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Video,
  Image as ImageIcon,
  Settings,
  UploadCloud,
} from "lucide-react";
import { auth, storage } from "@/lib/firebase";

// Custom SVG Icons for brand logos not included in this Lucide bundle
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const PLATFORM_OPTIONS = [
  { value: "youtube", label: "YouTube ▶️", description: "Upload videos directly to YouTube" },
  { value: "instagram", label: "Instagram 📸", description: "Post to Instagram (Image or Reel)" },
  { value: "facebook", label: "Facebook 📘", description: "Post to your Facebook Page (Text, Image, Video)" },
];

const YOUTUBE_CATEGORIES = [
  "Science & Technology",
  "Education",
  "Entertainment",
  "Gaming",
  "Howto & Style",
  "People & Blogs",
  "Music",
  "News & Politics",
];

const YOUTUBE_PRIVACY = [
  { value: "public", label: "Public (Visible to everyone)" },
  { value: "unlisted", label: "Unlisted (Anyone with link can view)" },
  { value: "private", label: "Private (Only you can view)" },
];

const CHAR_LIMITS: Record<string, number> = {
  facebook: 63206,
  instagram: 2200,
  youtube: 5000,
};

const PLATFORM_DETAILS: Record<string, {
  icon: React.ReactNode;
  activeClass: string;
  hoverClass: string;
  badgeClass: string;
  themeColor: string;
}> = {
  youtube: {
    icon: <YoutubeIcon className="w-5 h-5 text-red-500 shadow-sm" />,
    activeClass: "border-red-500 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    hoverClass: "hover:border-red-500/30 hover:bg-red-500/5",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    themeColor: "from-red-500 to-red-600",
  },
  instagram: {
    icon: <InstagramIcon className="w-5 h-5 text-pink-500 shadow-sm" />,
    activeClass: "border-pink-500 bg-pink-500/5 shadow-[0_0_15px_rgba(236,72,153,0.15)]",
    hoverClass: "hover:border-pink-500/30 hover:bg-pink-500/5",
    badgeClass: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    themeColor: "from-pink-500 to-rose-500",
  },
  facebook: {
    icon: <FacebookIcon className="w-5 h-5 text-blue-500 shadow-sm" />,
    activeClass: "border-blue-500 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
    hoverClass: "hover:border-blue-500/30 hover:bg-blue-500/5",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    themeColor: "from-blue-500 to-blue-600",
  },
  threads: {
    icon: <span className="text-xs font-bold text-white shadow-sm font-sans bg-neutral-800 border border-neutral-700 w-5 h-5 rounded-full flex items-center justify-center">@</span>,
    activeClass: "border-white bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.1)]",
    hoverClass: "hover:border-white/30 hover:bg-white/5",
    badgeClass: "bg-white/10 text-white border-white/20",
    themeColor: "from-neutral-600 to-neutral-800",
  },
};

const SUBMIT_THEMES: Record<string, string> = {
  youtube: "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white hover:shadow-[0_0_25px_rgba(239,68,68,0.35)] shadow-[0_4px_15px_rgba(239,68,68,0.15)]",
  instagram: "bg-gradient-to-r from-pink-600 via-rose-500 to-yellow-500 hover:from-pink-500 hover:to-rose-400 text-white hover:shadow-[0_0_25px_rgba(236,72,153,0.35)] shadow-[0_4px_15px_rgba(236,72,153,0.15)]",
  facebook: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.35)] shadow-[0_4px_15px_rgba(59,130,246,0.15)]",
  threads: "bg-gradient-to-r from-neutral-700 to-neutral-800 hover:from-neutral-600 hover:to-neutral-700 text-white hover:shadow-[0_0_25px_rgba(255,255,255,0.15)] shadow-[0_4px_15px_rgba(255,255,255,0.05)]",
};

export default function AddPostPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [platform, setPlatform] = useState("youtube");
  const [type, setType] = useState("video");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("public");
  const [category, setCategory] = useState("Science & Technology");
  const [tags, setTags] = useState("");
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().slice(0, 10));

  // Video file upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // AI Co-Pilot State
  const [copilotTopic, setCopilotTopic] = useState("");
  const [copilotTab, setCopilotTab] = useState<"ideas" | "hooks" | "optimize">("ideas");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResults, setCopilotResults] = useState<any>(null);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [hasServerKey, setHasServerKey] = useState(false);

  // Load Gemini key on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("ues_gemini_api_key");
      if (savedKey) setGeminiKey(savedKey);
    }
    // Fetch server Gemini key configuration status
    fetch("/api/ai/status")
      .then(res => res.json())
      .then(data => {
        if (data.hasServerKey) setHasServerKey(true);
      })
      .catch(err => console.error("Failed to fetch server AI status", err));
  }, []);

  async function handleGenerateSuggestions(mode: "ideas" | "hooks" | "optimize") {
    setCopilotLoading(true);
    setCopilotError(null);
    setCopilotResults(null);

    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
        },
        body: JSON.stringify({
          platform,
          type,
          currentTitle: title,
          currentDescription: description,
          topic: copilotTopic,
          mode,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate suggestions.");
      const data = await res.json();
      setCopilotResults(data);
    } catch (err: any) {
      setCopilotError(err.message || "An error occurred");
    } finally {
      setCopilotLoading(false);
    }
  }

  const isYouTube = platform === "youtube";
  const supportsMedia = platform === "facebook" || platform === "instagram";
  const isTextPlatform = platform === "facebook" || platform === "instagram";
  const charLimit = CHAR_LIMITS[platform] || 5000;

  // Combine title + description for text platforms
  const combinedText = description ? `${title.trim()}\n\n${description}` : title.trim();
  const charCount = combinedText.length;
  const isOverLimit = charCount > charLimit;

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        setError("Please select a valid video file (MP4, MOV, MKV, etc.).");
        return;
      }
      setError(null);
      setVideoFile(file);
      setThumbnailFile(null); // Clear image if video selected
      setThumbnailPreviewUrl(null);
      setVideoPreviewUrl(URL.createObjectURL(file));

      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        setTitle(nameWithoutExt);
      }
    }
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file.");
        return;
      }
      setError(null);
      setThumbnailFile(file);
      if (!isYouTube) {
        setVideoFile(null); // Clear video if image selected for FB/Threads
        setVideoPreviewUrl(null);
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setThumbnailPreviewUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!title.trim() && !videoFile && !thumbnailFile) {
      setError("Please enter content or select media to publish.");
      return;
    }

    if (isTextPlatform && isOverLimit) {
      setError(`Content exceeds the ${charLimit} character limit for ${platform.charAt(0).toUpperCase() + platform.slice(1)}.`);
      return;
    }

    if (isYouTube && !videoFile) {
      setError("Please select or upload a video file to publish to YouTube.");
      return;
    }

    if (platform === "instagram" && !videoFile && !thumbnailFile) {
      setError("Instagram requires an image or video to publish.");
      return;
    }

    setLoading(true);
    setUploadProgress(10);

    let mediaUrl: string | undefined = undefined;
    let mediaType: "image" | "video" | undefined = undefined;

    try {
      const user = auth.currentUser;
      let token = "";
      if (user) {
        token = await user.getIdToken();
      }

      // ── Media Upload Logic ──
      if (supportsMedia) {
        if (videoFile || thumbnailFile) {
          const fileToUpload = (videoFile || thumbnailFile) as File;
          mediaType = videoFile ? "video" : "image";
          setUploadProgress(20);

          try {
            setUploadProgress(30);
            const formData = new FormData();
            formData.append("file", fileToUpload);
            
            const uploadRes = await fetch("/api/media/upload", {
              method: "POST",
              body: formData,
            });
            
            setUploadProgress(60);
            if (!uploadRes.ok) {
              const errData = await uploadRes.json();
              throw new Error(errData.error || "Upload failed");
            }
            
            const uploadData = await uploadRes.json();
            mediaUrl = uploadData.url;
            setUploadProgress(70);
          } catch (err: any) {
            console.error("Upload Error:", err);
            throw new Error("Failed to upload media. Details: " + (err.message || err));
          }

          setUploadProgress(75);
        }
      }

      setUploadProgress(80);

      let reqBody: any;
      let headers: Record<string, string> = {};
      if (token) headers.authorization = `Bearer ${token}`;

      let endpoint = "/api/posts/create";

      if (platform === "instagram") {
        endpoint = "/api/instagram/publish";
        headers["Content-Type"] = "application/json";
        const combinedCaption = description ? `${title.trim()}\n\n${description}`.trim() : title.trim();
        reqBody = JSON.stringify({
          caption: combinedCaption,
          imageUrl: mediaType === "image" ? (mediaUrl || thumbnailPreviewUrl) : undefined,
          videoUrl: mediaType === "video" ? mediaUrl : undefined,
          connectionId: "instagram",
        });
      } else {
        headers["Content-Type"] = "application/json";
        reqBody = JSON.stringify({
          platform,
          type: isYouTube ? type : (mediaType === "video" ? "video" : "post"),
          title,
          description,
          privacyStatus,
          category,
          tags,
          fileName: videoFile?.name || undefined,
          fileSize: videoFile?.size ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB` : undefined,
          thumbnailUrl: undefined,
          mediaUrl,
          mediaType,
          publishedAt,
        });
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: reqBody,
      });

      setUploadProgress(90);

      if (!res.ok) {
        const payload = await res.json();
        const errMsg = payload.error || "Failed to publish content.";
        if (payload.rateLimited) {
          throw new Error(`⏳ ${errMsg}`);
        }
        if (res.status === 401) {
          throw new Error(`🔒 ${errMsg}`);
        }
        throw new Error(errMsg);
      }

      let data = await res.json();

      // Instagram asynchronous Reel/Video polling loop
      if (platform === "instagram" && data.isReady === false && data.creationId) {
        let attempts = 0;
        const maxAttempts = 30; // 60 seconds max
        const delayMs = 2000;
        let success = false;

        while (!success && attempts < maxAttempts) {
          attempts++;
          setError(`Instagram is processing your video. Please wait... (${attempts}/${maxAttempts})`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));

          const pollRes = await fetch(endpoint, {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ creationId: data.creationId }),
          });

          if (!pollRes.ok) {
            const pollErr = await pollRes.json();
            throw new Error(pollErr.error || "Failed to check Instagram video status.");
          }

          const pollData = await pollRes.json();
          if (pollData.isReady) {
            data = pollData;
            success = true;
            setError(null);
          }
        }

        if (!success) {
          throw new Error("Instagram is taking too long to process your video. Please check your Instagram app in a few minutes.");
        }
      }

      // Fallback YouTube client resumable upload if server returned resumableUrl without full direct upload
      if (data.resumableUrl && videoFile && data.videoId?.startsWith("yt-")) {
        setUploadProgress(85);
        try {
          const videoUploadRes = await fetch(data.resumableUrl, {
            method: "PUT",
            headers: { "Content-Type": videoFile.type || "video/mp4" },
            body: videoFile,
          });

          if (videoUploadRes.ok || videoUploadRes.status === 200 || videoUploadRes.status === 201) {
            try {
              const uploadedData = await videoUploadRes.json();
              if (uploadedData?.id) {
                data.videoId = uploadedData.id;
                if (data.post) {
                  data.post.id = uploadedData.id;
                  data.post.url = `https://www.youtube.com/watch?v=${uploadedData.id}`;
                }
              }
            } catch {}
          }
        } catch (uploadErr) {
          console.warn("Client video upload notice:", uploadErr);
        }
      }

      // YouTube: thumbnail upload
      if (isYouTube && thumbnailPreviewUrl && data.videoId) {
        try {
          const thumbRes = await fetch("/api/connections/youtube/thumbnail", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ videoId: data.videoId, thumbnail: thumbnailPreviewUrl }),
          });
          if (!thumbRes.ok) {
            const thumbErrData = await thumbRes.json();
            console.warn("Thumbnail upload warning:", thumbErrData);
          }
        } catch (thumbErr) {
          console.warn("Thumbnail upload warning:", thumbErr);
        }
      }

      setUploadProgress(100);

      const platformDisplay = platform.charAt(0).toUpperCase() + platform.slice(1);
      const publishedUrl = data.post?.url || data.videoUrl;
      setSuccessMessage(
        `🎉 Published to ${platformDisplay} successfully!${publishedUrl ? ` View: ${publishedUrl}` : ""}`
      );

      // Update local storage cache (only for mock posts, real posts are fetched via sync)
      if (typeof window !== "undefined" && data.post && !data.publishedToApi) {
        try {
          const cached = localStorage.getItem("ues_custom_posts");
          const customList = cached ? JSON.parse(cached) : [];
          customList.unshift(data.post);
          localStorage.setItem("ues_custom_posts", JSON.stringify(customList));
        } catch {}
      }

      // Stay on upload page, reset form state after a short delay so the user can see the success message
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ues-refresh-posts"));
        }
        setTitle("");
        setDescription("");
        setVideoFile(null);
        setVideoPreviewUrl(null);
        setThumbnailFile(null);
        setThumbnailPreviewUrl(null);
        setTags("");
        setUploadProgress(0);
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error publishing content.");
    } finally {
      setLoading(false);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  const platformDisplay = platform.charAt(0).toUpperCase() + platform.slice(1);

  return (
    <div className="page-enter">
      <PageHeader
        title="Publish Content"
        subtitle={`Create and publish content directly to ${platformDisplay}`}
        action={
          <Link href="/posts">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Posts
            </Button>
          </Link>
        }
      />

      <div className="px-9 pb-9 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-[#4ECDC4]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-20 right-80 w-80 h-80 bg-[#ff6b6b]/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Main form */}
        <Card className="relative overflow-hidden backdrop-blur-md bg-teal-card/80 border border-cyan-border/[0.15] shadow-2xl">
          <div className="flex items-center justify-between border-b border-cyan-border/10 pb-4">
            <div>
              <CardTitle className="text-lg font-bold tracking-tight bg-gradient-to-r from-mint via-mint/90 to-cyan-ues bg-clip-text text-transparent">
                {isYouTube ? "Upload & Publish YouTube Video" : `Publish to ${platformDisplay}`}
              </CardTitle>
              <CardSubtitle className="text-xs text-mint-700 mt-1">
                {isYouTube
                  ? "Select a video file, configure publishing details, and post directly to YouTube"
                  : `Write your content and publish it directly to ${platformDisplay}`}
              </CardSubtitle>
            </div>
            {(() => {
              const details = PLATFORM_DETAILS[platform] || { badgeClass: "bg-cyan-light/10 text-cyan-ues border-cyan-border/20" };
              return (
                <span className={`px-3.5 py-1.5 text-[10px] font-bold rounded-full border transition-all duration-300 ${details.badgeClass} uppercase tracking-wider shadow-sm`}>
                  {PLATFORM_OPTIONS.find(p => p.value === platform)?.label || platform}
                </span>
              );
            })()}
          </div>

          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-pink-light/30 border border-pink-ues/20 text-xs text-pink-ues font-medium backdrop-blur-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3.5 rounded-xl bg-cyan-light/20 border border-cyan-border/20 text-xs text-cyan-ues font-semibold backdrop-blur-sm">
              ✓ {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Platform selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-mint-700 uppercase tracking-wider">Select Platform</label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {PLATFORM_OPTIONS.map((o) => {
                  const details = PLATFORM_DETAILS[o.value] || {
                    icon: "✨",
                    activeClass: "border-cyan-ues bg-cyan-light/[0.06]",
                    hoverClass: "hover:bg-teal-card/50",
                  };
                  const isActive = platform === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        setPlatform(o.value);
                        setError(null);
                        setSuccessMessage(null);
                        setVideoFile(null);
                        setThumbnailFile(null);
                        setVideoPreviewUrl(null);
                        setThumbnailPreviewUrl(null);
                      }}
                      className={`p-4 rounded-2xl text-left transition-all duration-300 border flex flex-col justify-between h-[96px] ${
                        isActive
                          ? `${details.activeClass} scale-[1.02]`
                          : `border-cyan-border/10 bg-teal-card/20 ${details.hoverClass} hover:scale-[1.01]`
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{details.icon}</span>
                        <div className="text-xs font-bold text-[var(--color-mint)]">{o.label.split(" ")[0]}</div>
                      </div>
                      <div className="text-[9px] text-mint-700 leading-snug line-clamp-2">{o.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* YouTube: Video Format Type */}
            {isYouTube && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-mint-700 uppercase tracking-wider">Video Format / Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="ues-select bg-teal-surface/30 backdrop-blur-sm border-cyan-border/20 focus:border-cyan-ues focus:shadow-[0_0_15px_rgba(78,205,196,0.15)] rounded-2xl transition duration-300">
                  <option value="video">Long-form Video (Standard)</option>
                  <option value="short">YouTube Short / Short Video</option>
                </select>
              </div>
            )}

            {/* Video File Upload (YouTube or Facebook/Threads) */}
            {(isYouTube || supportsMedia) && !thumbnailFile && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-mint-700 uppercase tracking-wider">
                  {isYouTube ? "Upload Video File *" : "Upload Video (Optional)"}
                </label>
                <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-sm group ${
                    videoFile
                      ? "border-cyan-ues bg-cyan-light/[0.04] shadow-[0_0_20px_rgba(78,205,196,0.05)]"
                      : "border-cyan-border/20 hover:border-cyan-ues/50 bg-teal-surface/20 hover:bg-teal-surface/40 shadow-inner"
                  }`}
                >
                  {videoFile ? (
                    <div className="w-full flex flex-col items-center gap-4">
                      {videoPreviewUrl && (
                        <video src={videoPreviewUrl} controls className="max-h-48 rounded-xl border border-cyan-border/20 shadow-md" />
                      )}
                      <div className="text-center">
                        <p className="text-sm font-semibold text-cyan-ues">{videoFile.name}</p>
                        <p className="text-xs text-mint-700 mt-1">{formatBytes(videoFile.size)} • Ready for upload</p>
                      </div>
                      <Button type="button" variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setVideoFile(null); setVideoPreviewUrl(null); }} className="px-4 py-1.5 text-xs">
                        Remove Video
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center py-4">
                      <div className="w-14 h-14 rounded-full bg-cyan-mid/20 flex items-center justify-center text-2xl text-cyan-ues group-hover:scale-110 group-hover:bg-cyan-ues/20 transition-all duration-300 shadow-[0_0_12px_rgba(78,205,196,0.15)]">📹</div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-mint)]">Click to browse or drag & drop video file</p>
                        <p className="text-xs text-mint-700 mt-1.5">MP4, MOV, MKV, or AVI</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Custom Image / Thumbnail */}
            {(isYouTube || supportsMedia) && !videoFile && (
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-[10px] font-bold text-mint-700 uppercase tracking-wider">
                  {isYouTube ? "Custom Thumbnail (Optional)" : "Upload Image (Optional)"}
                </label>
                <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="flex items-center gap-4 p-4 border border-cyan-border/10 rounded-2xl bg-teal-card/20 backdrop-blur-sm cursor-pointer hover:bg-teal-card/40 hover:border-cyan-ues/40 transition-all duration-300 shadow-sm"
                >
                  {thumbnailPreviewUrl ? (
                    <img src={thumbnailPreviewUrl} alt="Preview" className="w-16 h-10 object-cover rounded-xl border border-cyan-border/20 shadow-md" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-cyan-mid/20 flex items-center justify-center text-2xl text-cyan-ues shadow-sm">🖼️</div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[var(--color-mint)]">
                      {thumbnailFile ? thumbnailFile.name : (isYouTube ? "Select custom thumbnail image" : "Select an image to post")}
                    </p>
                    <p className="text-[10px] text-mint-700 mt-0.5">PNG or JPG</p>
                  </div>
                  {thumbnailFile && (
                    <Button type="button" variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setThumbnailFile(null); setThumbnailPreviewUrl(null); }} className="px-3.5 py-1.5 text-xs">
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Title / Content */}
            <Input
              label={isYouTube ? "YouTube Video Title *" : "Content / Title *"}
              placeholder={
                isYouTube ? "e.g. Building Next-Gen Analytics in 2026"
                : platform === "x" ? "What's happening? (280 chars max)"
                : "Write your post..."
              }
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required={isYouTube || (!videoFile && !thumbnailFile)}
              className="bg-teal-surface/20 border-cyan-border/20 focus:border-cyan-ues focus:shadow-[0_0_15px_rgba(78,205,196,0.15)] rounded-2xl transition duration-300"
            />

            {/* Description / Body */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-mint-700 uppercase tracking-wider">
                {isYouTube ? "Video Description" : "Additional Details (optional)"}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isYouTube
                    ? "Describe your video content, add links, timestamps..."
                    : "Add more details or context to your post..."
                }
                rows={isYouTube ? 4 : 3}
                className="ues-select font-sans text-sm resize-y bg-teal-surface/20 border-cyan-border/20 focus:border-cyan-ues focus:shadow-[0_0_15px_rgba(78,205,196,0.15)] rounded-2xl transition duration-300 min-h-[120px] px-4 py-3"
              />
              {/* Character counter for text platforms */}
              {isTextPlatform && (
                <div className={`text-right text-[10px] font-mono ${isOverLimit ? "text-pink-ues font-semibold animate-pulse" : "text-mint-700"}`}>
                  {charCount} / {charLimit}
                </div>
              )}
            </div>

            {/* YouTube Specific Settings */}
            {isYouTube && (
              <div className="p-5 rounded-2xl border border-cyan-border/10 bg-teal-surface/30 backdrop-blur-sm space-y-4 shadow-sm">
                <p className="text-[10px] font-bold text-cyan-ues uppercase tracking-widest flex items-center gap-1.5">
                  <span>⚙️</span> YouTube Publishing & Metadata Settings
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-mint-700 uppercase tracking-wider">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="ues-select bg-teal-surface/30 border-cyan-border/25 focus:border-cyan-ues rounded-2xl transition duration-300">
                      {YOUTUBE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-mint-700 uppercase tracking-wider">Privacy Status</label>
                    <select value={privacyStatus} onChange={(e) => setPrivacyStatus(e.target.value)} className="ues-select bg-teal-surface/30 border-cyan-border/25 focus:border-cyan-ues rounded-2xl transition duration-300">
                      {YOUTUBE_PRIVACY.map((priv) => (
                        <option key={priv.value} value={priv.value}>{priv.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Input
                  label="Tags / Keywords (comma separated)"
                  placeholder="analytics, youtube, ues, tutorial, metrics"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="bg-teal-surface/20 border-cyan-border/20 focus:border-cyan-ues focus:shadow-[0_0_15px_rgba(78,205,196,0.15)] rounded-2xl transition duration-300"
                />
              </div>
            )}

            {/* Publish Date (YouTube only) */}
            {isYouTube && (
              <Input
                label="Publish Date"
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="bg-teal-surface/20 border-cyan-border/20 focus:border-cyan-ues focus:shadow-[0_0_15px_rgba(78,205,196,0.15)] rounded-2xl transition duration-300"
              />
            )}

            {/* Upload Progress Bar */}
            {loading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-mint-700">
                  <span>{uploadProgress < 80 ? "Uploading media to secure storage..." : `Publishing to ${platformDisplay}...`}</span>
                  <span className="font-semibold text-cyan-ues">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-teal-card rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-cyan-ues transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className={`w-full mt-4 font-bold text-sm tracking-wider py-4 rounded-2xl hover:scale-[1.01] transition-all duration-300 active:scale-[0.99] border-0 cursor-pointer ${
                SUBMIT_THEMES[platform] || "bg-cyan-ues text-teal-dark hover:bg-[#5de0d7] hover:shadow-[0_0_20px_rgba(78,205,196,0.4)] shadow-[0_4px_15px_rgba(78,205,196,0.15)]"
              }`}
              disabled={loading || (isTextPlatform && isOverLimit)}
            >
              {loading
                ? `Publishing (${uploadProgress}%)...`
                : isYouTube
                ? "🚀 Upload & Publish to YouTube"
                : `🚀 Publish to ${platformDisplay}`}
            </Button>
          </form>
        </Card>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* AI Content Co-Pilot Card */}
          <Card className="border border-cyan-border/30 bg-teal-surface/20 shadow-md overflow-hidden p-5">
            <div className="flex items-center justify-between border-b border-cyan-border/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <div>
                  <h3 className="font-display font-bold text-sm text-mint">AI Content Co-Pilot</h3>
                  <p className="text-[10px] text-mint-700">Real-time creator ideas & hook booster</p>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full ${(geminiKey || hasServerKey) ? "bg-cyan-ues animate-pulse" : "bg-amber-500"}`} title={(geminiKey || hasServerKey) ? "Gemini Key Active" : "Local Fallback Active"} />
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-teal-dark/40 p-1 rounded-xl mb-4 text-center">
              {(["ideas", "hooks", "optimize"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setCopilotTab(tab);
                    setCopilotResults(null);
                    setCopilotError(null);
                  }}
                  className={`py-1.5 rounded-lg text-[10px] font-semibold tracking-wide transition-all uppercase ${
                    copilotTab === tab
                      ? "bg-cyan-mid text-cyan-ues shadow-sm"
                      : "text-mint-700 hover:text-mint"
                  }`}
                >
                  {tab === "ideas" ? "Ideas" : tab === "hooks" ? "Hooks" : "Optimize"}
                </button>
              ))}
            </div>

            {/* Tab Panels */}
            {copilotTab === "ideas" && (
              <div className="space-y-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-mint-700">Topic or Keywords</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. coding tips, fitness..."
                      value={copilotTopic}
                      onChange={(e) => setCopilotTopic(e.target.value)}
                      className="flex-1 bg-[#0b191c]/80 border border-cyan-border/20 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-ues text-mint placeholder:text-mint-700/40"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={copilotLoading}
                      onClick={() => handleGenerateSuggestions("ideas")}
                      className="px-3 text-xs"
                    >
                      {copilotLoading ? "..." : "Go"}
                    </Button>
                  </div>
                </div>

                {copilotResults?.ideas && (
                  <div className="space-y-3 pt-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                    {copilotResults.ideas.map((idea: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border border-cyan-border/10 bg-teal-card/30 space-y-2">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="text-xs font-bold text-mint leading-snug">{idea.title}</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setTitle(idea.title);
                              if (idea.description) setDescription(idea.description);
                              if (idea.tags && isYouTube) setTags(idea.tags.join(", "));
                            }}
                            className="text-[9px] text-cyan-ues hover:underline flex-shrink-0 font-medium"
                          >
                            Apply Draft
                          </button>
                        </div>
                        <p className="text-[10px] text-[#F7FFF7]/80 leading-relaxed italic border-l border-cyan-ues/40 pl-2">
                          Hook: {idea.hook}
                        </p>
                        {idea.tags && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {idea.tags.map((tg: string, i: number) => (
                              <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-[#4ECDC4]/5 text-cyan-ues/90 border border-cyan-border/10">
                                #{tg}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {copilotTab === "hooks" && (
              <div className="space-y-3.5">
                <p className="text-[10px] text-mint-700 leading-normal">
                  Generates scroll-stopping hooks and alternative titles based on your current Title and Description.
                </p>
                {!title.trim() && (
                  <p className="text-[10px] text-amber-500 font-medium leading-normal bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                    ⚠️ Please type a post Title in the left form first to generate hooks.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-cyan-border/25 text-mint"
                  disabled={copilotLoading || !title.trim()}
                  onClick={() => handleGenerateSuggestions("hooks")}
                >
                  {copilotLoading ? "Generating Hook Variants..." : "⚡ Generate Hooks"}
                </Button>

                {copilotResults?.hooks && (
                  <div className="space-y-2.5 pt-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                    {copilotResults.hooks.map((hook: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border border-cyan-border/10 bg-teal-card/30 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-cyan-ues uppercase tracking-wider">{hook.type}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const separator = description ? "\n\n" : "";
                              setDescription(`"${hook.text}"${separator}${description}`);
                            }}
                            className="text-[9px] text-cyan-ues hover:underline font-medium"
                          >
                            Add to Body
                          </button>
                        </div>
                        <p className="text-xs text-[#F7FFF7]/90 leading-relaxed font-medium">"{hook.text}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {copilotTab === "optimize" && (
              <div className="space-y-3.5">
                <p className="text-[10px] text-mint-700 leading-normal">
                  Improves search tags, structures descriptions, and generates engaging Calls to Action (CTAs).
                </p>
                {!title.trim() && (
                  <p className="text-[10px] text-amber-500 font-medium leading-normal bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                    ⚠️ Please type a post Title in the left form first to optimize your draft.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-cyan-border/25 text-mint"
                  disabled={copilotLoading || !title.trim()}
                  onClick={() => handleGenerateSuggestions("optimize")}
                >
                  {copilotLoading ? "Analyzing & Optimizing..." : "📈 Optimize Draft"}
                </Button>

                {copilotResults && (
                  <div className="space-y-3 pt-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin text-[11px] text-[#F7FFF7]/90">
                    {copilotResults.optimizedTitle && (
                      <div className="p-3 rounded-xl border border-cyan-border/10 bg-teal-card/30 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-cyan-ues uppercase">Optimized Title</span>
                          <button
                            type="button"
                            onClick={() => setTitle(copilotResults.optimizedTitle)}
                            className="text-[9px] text-cyan-ues hover:underline font-medium"
                          >
                            Apply Title
                          </button>
                        </div>
                        <p className="font-semibold text-mint">{copilotResults.optimizedTitle}</p>
                      </div>
                    )}

                    {copilotResults.optimizedDescription && (
                      <div className="p-3 rounded-xl border border-cyan-border/10 bg-teal-card/30 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-cyan-ues uppercase">Formatted Body</span>
                          <button
                            type="button"
                            onClick={() => setDescription(copilotResults.optimizedDescription)}
                            className="text-[9px] text-cyan-ues hover:underline font-medium"
                          >
                            Replace Body
                          </button>
                        </div>
                        <p className="text-[10px] text-mint-700 line-clamp-3">{copilotResults.optimizedDescription}</p>
                      </div>
                    )}

                    {copilotResults.cta && (
                      <div className="p-3 rounded-xl border border-cyan-border/10 bg-teal-card/30 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-cyan-ues uppercase">Call to Action (CTA)</span>
                          <button
                            type="button"
                            onClick={() => {
                              const separator = description ? "\n\n" : "";
                              setDescription(`${description}${separator}${copilotResults.cta}`);
                            }}
                            className="text-[9px] text-cyan-ues hover:underline font-medium"
                          >
                            Append CTA
                          </button>
                        </div>
                        <p className="text-xs italic">"{copilotResults.cta}"</p>
                      </div>
                    )}

                    {copilotResults.suggestedTags && (
                      <div className="p-3 rounded-xl border border-cyan-border/10 bg-teal-card/30 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-cyan-ues uppercase">SEO Keywords</span>
                          {isYouTube && (
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = tags ? `${tags}, ${copilotResults.suggestedTags.join(", ")}` : copilotResults.suggestedTags.join(", ");
                                setTags(newTags);
                              }}
                              className="text-[9px] text-cyan-ues hover:underline font-medium"
                            >
                              Add to Tags
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {copilotResults.suggestedTags.map((tg: string, i: number) => (
                            <span key={i} className="text-[9px] text-mint-700">#{tg}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {copilotError && (
              <div className="mt-3 p-2.5 rounded-xl bg-pink-light border border-pink-ues/15 text-[10px] text-pink-ues leading-relaxed">
                ⚠️ {copilotError}
              </div>
            )}
          </Card>

          {/* Platform Info Card */}
          <Card>
            <CardTitle>{platformDisplay} Publishing</CardTitle>
            <CardSubtitle>
              {isYouTube ? "Video upload details" : "Post details"}
            </CardSubtitle>
            <div className="mt-4 space-y-3 text-xs text-mint-700">
              {videoFile && (
                <>
                  <div className="flex justify-between py-1 border-b border-cyan-border/10">
                    <span>Video File:</span>
                    <span className="font-semibold text-[var(--color-mint)] truncate max-w-[160px]">
                      {videoFile.name}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-cyan-border/10">
                    <span>File Size:</span>
                    <span className="font-semibold text-cyan-ues">
                      {formatBytes(videoFile.size)}
                    </span>
                  </div>
                </>
              )}
              {thumbnailFile && (
                <>
                  <div className="flex justify-between py-1 border-b border-cyan-border/10">
                    <span>Image File:</span>
                    <span className="font-semibold text-[var(--color-mint)] truncate max-w-[160px]">
                      {thumbnailFile.name}
                    </span>
                  </div>
                </>
              )}
              {isYouTube && (
                <>
                  <div className="flex justify-between py-1 border-b border-cyan-border/10">
                    <span>Privacy:</span>
                    <span className="font-semibold text-[var(--color-mint)] capitalize">{privacyStatus}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-cyan-border/10">
                    <span>Category:</span>
                    <span className="font-semibold text-[var(--color-mint)]">{category}</span>
                  </div>
                </>
              )}
              {isTextPlatform && (
                <>
                  <div className="flex justify-between py-1 border-b border-cyan-border/10">
                    <span>Platform:</span>
                    <span className="font-semibold text-[var(--color-mint)]">{platformDisplay}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-cyan-border/10">
                    <span>Characters:</span>
                    <span className={`font-semibold ${isOverLimit ? "text-pink-ues" : "text-cyan-ues"}`}>
                      {charCount} / {charLimit}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-cyan-border/10">
                    <span>Type:</span>
                    <span className="font-semibold text-[var(--color-mint)]">
                      {videoFile ? "Video Post" : thumbnailFile ? "Image Post" : "Text Post"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Platform-specific guidance */}
          <Card>
            <CardTitle>
              {isYouTube ? "YouTube Upload Checklist" : `${platformDisplay} Tips`}
            </CardTitle>
            <CardSubtitle>
              {isYouTube ? "Best practices for maximum views" : "Best practices for engagement"}
            </CardSubtitle>
            <ul className="mt-3 space-y-2 text-xs text-mint-700">
              {isYouTube && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">✓</span> Video file selected (MP4 / MOV)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">✓</span> Actionable title under 70 chars
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">✓</span> Description filled out
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">✓</span> Tags added for search indexing
                  </li>
                </>
              )}
              {platform === "x" && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">✓</span> Keep tweets concise (under 280 chars)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">✓</span> Use hashtags strategically
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">✓</span> Post during peak engagement hours
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">ℹ</span> Text-only (media requires OAuth 1.0a)
                  </li>
                </>
              )}
              {platform === "facebook" && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">✓</span> Posts go to your first managed Page
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">✓</span> You can now attach images or video!
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">✓</span> Keep it conversational and authentic
                  </li>
                </>
              )}
              {platform === "instagram" && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">✓</span> Requires a connected Professional Account
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">✓</span> Must include an image or video
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-ues font-bold">ℹ</span> Videos will be published as Reels
                  </li>
                </>
              )}
            </ul>
          </Card>

          {/* Real-Time Tracking */}
          <Card>
            <CardTitle>Real-Time Tracking</CardTitle>
            <CardSubtitle>Automatic metric synchronization</CardSubtitle>
            <p className="mt-3 text-xs text-mint-700 leading-relaxed">
              Once published, real-time views, likes, comments, and UES score will be tracked automatically from {platformDisplay}.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
