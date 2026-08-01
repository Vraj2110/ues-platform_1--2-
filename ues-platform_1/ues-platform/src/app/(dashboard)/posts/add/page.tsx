"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const PLATFORM_OPTIONS = [
  { value: "youtube", label: "YouTube ▶️", description: "Upload videos directly to YouTube" },
  { value: "instagram", label: "Instagram 📸", description: "Post to Instagram (Image or Reel)" },
  { value: "x", label: "X / Twitter 🐦", description: "Post tweets (text, max 280 chars)" },
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
  x: 280,
  facebook: 63206,
  instagram: 2200,
  youtube: 5000,
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

  const isYouTube = platform === "youtube";
  const supportsMedia = platform === "facebook" || platform === "instagram";
  const isTextPlatform = platform === "x" || platform === "facebook" || platform === "instagram";
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
      setError(`Content exceeds the ${charLimit} character limit for ${platform === "x" ? "X/Twitter" : platform}.`);
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
           const fileToUpload = videoFile || thumbnailFile;
           mediaType = videoFile ? "video" : "image";
           setUploadProgress(20);
           const fileName = `${Date.now()}_${fileToUpload?.name}`;
           const storageRef = ref(storage, `uploads/${user?.uid || 'guest'}/${fileName}`);
           
           await new Promise<void>((resolve, reject) => {
             const uploadTask = uploadBytesResumable(storageRef, fileToUpload as File);
             uploadTask.on('state_changed', 
               (snapshot) => {
                 const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 50;
                 setUploadProgress(20 + Math.round(progress));
               },
               (err) => reject(err),
               async () => {
                 mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
                 resolve();
               }
             );
           });
           setUploadProgress(75);
        }
      }

      setUploadProgress(80);

      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          platform,
          type: isYouTube ? type : (mediaType === "video" ? "video" : "post"),
          title,
          description,
          privacyStatus,
          category,
          tags,
          fileName: videoFile?.name || undefined,
          fileSize: videoFile?.size ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB` : undefined,
          thumbnailUrl: thumbnailPreviewUrl || undefined,
          mediaUrl,
          mediaType,
          publishedAt,
        }),
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

      const data = await res.json();

      // YouTube: handle resumable upload of video binary
      if (data.resumableUrl && videoFile) {
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
                const oldId = data.videoId;
                data.videoId = uploadedData.id;
                if (data.post) {
                  data.post.id = uploadedData.id;
                  data.post.url = `https://www.youtube.com/watch?v=${uploadedData.id}`;
                }
                try {
                  await fetch("/api/posts/confirm-upload", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(token ? { authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ oldId, newId: uploadedData.id }),
                  });
                } catch (e) {}
              }
            } catch {}
          }
        } catch (uploadErr) {
          console.warn("Video upload notice:", uploadErr);
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

      const platformDisplay = platform === "x" ? "X/Twitter" : platform.charAt(0).toUpperCase() + platform.slice(1);
      const publishedUrl = data.post?.url || data.videoUrl;
      setSuccessMessage(
        `🎉 Published to ${platformDisplay} successfully!${publishedUrl ? ` View: ${publishedUrl}` : ""}`
      );

      // Update local storage cache
      if (typeof window !== "undefined" && data.post) {
        try {
          const cached = localStorage.getItem("ues_custom_posts");
          const customList = cached ? JSON.parse(cached) : [];
          customList.unshift(data.post);
          localStorage.setItem("ues_custom_posts", JSON.stringify(customList));
        } catch {}
      }

      // Trigger refresh and redirect
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ues-refresh-posts"));
          window.location.href = "/content?published=true";
        } else {
          router.push("/content");
        }
      }, 300);
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

  const platformDisplay = platform === "x" ? "X / Twitter" : platform.charAt(0).toUpperCase() + platform.slice(1);

  return (
    <div className="page-enter">
      <PageHeader
        title="Publish Content"
        subtitle={`Create and publish content directly to ${platformDisplay}`}
        action={
          <Link href="/posts">
            <Button variant="ghost">← Back to Posts</Button>
          </Link>
        }
      />

      <div className="px-9 pb-9 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Main form */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {isYouTube ? "Upload & Publish YouTube Video" : `Publish to ${platformDisplay}`}
              </CardTitle>
              <CardSubtitle>
                {isYouTube
                  ? "Select a video file, configure publishing details, and post directly to YouTube"
                  : `Write your content and publish it directly to ${platformDisplay}`}
              </CardSubtitle>
            </div>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#4ECDC4]/10 text-cyan-ues border border-cyan-border/20">
              {PLATFORM_OPTIONS.find(p => p.value === platform)?.label || platform}
            </span>
          </div>

          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-pink-light border border-pink-ues/20 text-xs text-pink-ues">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3.5 rounded-xl bg-cyan-light border border-cyan-border/20 text-xs text-cyan-ues font-semibold">
              ✓ {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Platform selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-mint-700">Platform</label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {PLATFORM_OPTIONS.map((o) => (
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
                    className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                      platform === o.value
                        ? "border-cyan-ues/50 bg-cyan-light/[0.06] shadow-sm"
                        : "border-cyan-border/10 bg-teal-card/30 hover:bg-teal-card/50"
                    }`}
                  >
                    <div className="text-sm font-semibold text-[var(--color-mint)]">{o.label}</div>
                    <div className="text-[10px] text-mint-700 mt-0.5">{o.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* YouTube: Video Format Type */}
            {isYouTube && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-mint-700">Video Format / Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="ues-select">
                  <option value="video">Long-form Video (Standard)</option>
                  <option value="short">YouTube Short / Short Video</option>
                </select>
              </div>
            )}

            {/* Video File Upload (YouTube or Facebook/Threads) */}
            {(isYouTube || supportsMedia) && !thumbnailFile && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-mint-700">
                  {isYouTube ? "Upload Video File *" : "Upload Video (Optional)"}
                </label>
                <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
                    videoFile
                      ? "border-cyan-ues/50 bg-cyan-light/[0.04]"
                      : "border-cyan-border/25 hover:border-cyan-ues/40 bg-teal-surface/50 hover:bg-teal-surface"
                  }`}
                >
                  {videoFile ? (
                    <div className="w-full flex flex-col items-center gap-3">
                      {videoPreviewUrl && (
                        <video src={videoPreviewUrl} controls className="max-h-48 rounded-xl border border-cyan-border/20 shadow-md" />
                      )}
                      <div className="text-center">
                        <p className="text-sm font-semibold text-cyan-ues">{videoFile.name}</p>
                        <p className="text-xs text-mint-700 mt-0.5">{formatBytes(videoFile.size)} • Ready for upload</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setVideoFile(null); setVideoPreviewUrl(null); }}>
                        Remove Video
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-cyan-mid/20 flex items-center justify-center text-2xl text-cyan-ues">📹</div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-mint)]">Click to browse or drag & drop video file</p>
                        <p className="text-xs text-mint-700 mt-1">MP4, MOV, MKV, or AVI</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Custom Image / Thumbnail */}
            {(isYouTube || supportsMedia) && !videoFile && (
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-xs font-medium text-mint-700">
                  {isYouTube ? "Custom Thumbnail (Optional)" : "Upload Image (Optional)"}
                </label>
                <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="flex items-center gap-3 p-3 border border-cyan-border/20 rounded-xl bg-teal-card/40 cursor-pointer hover:bg-teal-card/70 transition"
                >
                  {thumbnailPreviewUrl ? (
                    <img src={thumbnailPreviewUrl} alt="Preview" className="w-16 h-10 object-cover rounded-md" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-cyan-mid/20 flex items-center justify-center text-cyan-ues">🖼️</div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[var(--color-mint)]">
                      {thumbnailFile ? thumbnailFile.name : (isYouTube ? "Select custom thumbnail image" : "Select an image to post")}
                    </p>
                    <p className="text-[11px] text-mint-700">PNG or JPG</p>
                  </div>
                  {thumbnailFile && (
                    <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setThumbnailFile(null); setThumbnailPreviewUrl(null); }}>
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
            />

            {/* Description / Body */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-mint-700">
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
                className="ues-select font-sans text-sm resize-y"
              />
              {/* Character counter for text platforms */}
              {isTextPlatform && (
                <div className={`text-right text-[11px] font-mono ${isOverLimit ? "text-pink-ues font-semibold" : "text-mint-700"}`}>
                  {charCount} / {charLimit}
                </div>
              )}
            </div>

            {/* YouTube Specific Settings */}
            {isYouTube && (
              <div className="p-4 rounded-2xl border border-cyan-border/20 bg-teal-surface/50 space-y-4">
                <p className="text-xs font-bold text-cyan-ues uppercase tracking-wider">
                  ⚙️ YouTube Publishing & Metadata Settings
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-mint-700">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="ues-select">
                      {YOUTUBE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-mint-700">Privacy Status</label>
                    <select value={privacyStatus} onChange={(e) => setPrivacyStatus(e.target.value)} className="ues-select">
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
              />
            )}

            {/* Upload Progress Bar */}
            {loading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-mint-700">
                  <span>{uploadProgress < 80 ? "Uploading media to secure storage..." : `Publishing to ${platformDisplay}...`}</span>
                  <span className="font-semibold text-cyan-ues">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-teal-card rounded-full overflow-hidden">
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
              className="w-full mt-3"
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
