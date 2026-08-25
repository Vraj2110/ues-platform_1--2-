import { BasePlatformSyncAdapter } from "./baseAdapter";
import { InstagramSyncAdapter } from "./instagramAdapter";
import { YouTubeSyncAdapter } from "./youtubeAdapter";
import { XTwitterSyncAdapter } from "./twitterAdapter";
import { FacebookSyncAdapter } from "./facebookAdapter";
import type { PlatformId } from "@/types";

export * from "./baseAdapter";
export * from "./instagramAdapter";
export * from "./youtubeAdapter";
export * from "./twitterAdapter";
export * from "./facebookAdapter";

export function getPlatformAdapter(platformId: PlatformId): BasePlatformSyncAdapter | null {
  switch (platformId) {
    case "instagram":
      return new InstagramSyncAdapter();
    case "youtube":
      return new YouTubeSyncAdapter();
    case "x":
      return new XTwitterSyncAdapter();
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
    new XTwitterSyncAdapter(),
    new FacebookSyncAdapter(),
  ];
}
