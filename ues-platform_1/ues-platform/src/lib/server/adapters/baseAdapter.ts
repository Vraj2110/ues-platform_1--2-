import type { PlatformId, PostMetrics, PostType } from "@/types";

export interface FetchedPostItem {
  platformPostId: string;
  accountId: string;
  title: string;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  type: PostType;
  privacyStatus?: string;
  metrics: PostMetrics;
  uesScore: number;
  publishedAt: string;
}

export interface CreatePostPayload {
  caption: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  url?: string;
  error?: string;
  rateLimited?: boolean;
}

export interface AuthCheckResult {
  valid: boolean;
  status: "success" | "auth_required" | "rate_limited";
  error?: string;
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  accountName?: string;
}

export abstract class BasePlatformSyncAdapter {
  abstract readonly platformId: PlatformId;

  abstract checkAuthentication(uid: string): Promise<AuthCheckResult>;

  abstract fetchPosts(uid: string, auth: AuthCheckResult): Promise<FetchedPostItem[]>;

  abstract createPost(uid: string, auth: AuthCheckResult, payload: CreatePostPayload): Promise<PublishResult>;

  abstract deletePost(uid: string, auth: AuthCheckResult, platformPostId: string): Promise<{ success: boolean; error?: string }>;
}
