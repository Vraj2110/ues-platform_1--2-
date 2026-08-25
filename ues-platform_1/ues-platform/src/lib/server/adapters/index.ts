import { BasePlatformSyncAdapter } from "./baseAdapter";
import { InstagramSyncAdapter } from "./instagramAdapter";
import { YouTubeSyncAdapter } from "./youtubeAdapter";
import { ThreadsSyncAdapter } from "./threadsAdapter";
import { FacebookSyncAdapter } from "./facebookAdapter";
import type { PlatformId } from "@/types";

export * from "./baseAdapter";
export * from "./instagramAdapter";
export * from "./youtubeAdapter";
export * from "./threadsAdapter";
export * from "./facebookAdapter";

export function getPlatformAdapter(platformId: PlatformId): BasePlatformSyncAdapter | null {
  switch (platformId) {
    case "instagram":
      return new InstagramSyncAdapter();
    case "youtube":
      return new YouTubeSyncAdapter();
    case "threads":
      return new ThreadsSyncAdapter();
    case "facebook":
      return new FacebookSyncAdapter();
    default:
      return null;
  }
}

export function getAllPlatformAdapters(): BasePlatformSyncAdapter[] {
  return [
    new InstagramSyncAdapter(),
    new YouTubeSyncAdapter(),
    new ThreadsSyncAdapter(),
    new FacebookSyncAdapter(),
  ];
}
