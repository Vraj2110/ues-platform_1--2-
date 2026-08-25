import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getAllPlatformAdapters, BasePlatformSyncAdapter } from "@/lib/server/adapters";
import {
  getUserConnections,
  syncCustomPostsWithLiveOrigin,
  saveCustomUserPost,
  getCustomUserPosts,
  getDeletedPostIds,
} from "@/lib/server/connections";
import type { PlatformSyncResult, SyncReport } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const decoded = await verifyIdToken(request);
    const uid = (decoded as any)?.uid || "demo-user";

    const connections = await getUserConnections(uid);
    const adapters = getAllPlatformAdapters();
    const deletedPostSet = getDeletedPostIds(uid);

    let totalChecked = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    let totalDeleted = 0;
    const platformResults: Record<string, PlatformSyncResult> = {};

    const syncTasks = adapters.map(async (adapter: BasePlatformSyncAdapter) => {
      const platId = adapter.platformId;
      const conn = connections[platId];

      if (!conn?.connected) {
        return;
      }

      try {
        const auth = await adapter.checkAuthentication(uid);
        if (!auth.valid) {
          platformResults[platId] = {
            platformId: platId,
            status: auth.status || "auth_required",
            checkedCount: 0,
            newCount: 0,
            updatedCount: 0,
            deletedCount: 0,
            errorMessage: auth.error || "Authentication required",
          };
          return;
        }

        const fetchedPosts = await adapter.fetchPosts(uid, auth);
        const liveIds = fetchedPosts.map((p) => p.platformPostId);

        // Detect external deletions & reconcile
        const previousPosts = getCustomUserPosts(uid).filter((p: any) => p.platform === platId);
        const previousIdSet = new Set(previousPosts.map((p: any) => String(p.platformPostId || p.id).replace(/^(ig-live-|yt-live-|x-live-|fb-live-|ig-|yt-|x-|fb-)/, "")));
        const fetchedIdSet = new Set(liveIds);

        let newCount = 0;
        let updatedCount = 0;
        let deletedCount = 0;

        const activePosts = fetchedPosts.filter((post) => {
          const rawId = post.platformPostId;
          const prefixedId = `${platId === "instagram" ? "ig" : platId === "x" ? "x" : platId === "facebook" ? "fb" : "yt"}-live-${rawId}`;
          return !deletedPostSet.has(prefixedId) && !deletedPostSet.has(rawId);
        });

        activePosts.forEach((post) => {
          const rawId = post.platformPostId;
          const prefixedId = `${platId === "instagram" ? "ig" : platId === "x" ? "x" : platId === "facebook" ? "fb" : "yt"}-live-${rawId}`;

          if (!previousIdSet.has(rawId)) {
            newCount++;
          } else {
            updatedCount++;
          }

          console.log(`[Instagram Sync Debug] Updating Database for post ID: ${prefixedId}`);
          console.log(`  - Title: ${post.title}`);
          console.log(`  - Database views: ${post.metrics?.views}`);
          console.log(`  - Database shares: ${post.metrics?.shares}`);
          console.log(`  - Database likes: ${post.metrics?.likes}`);
          console.log(`  - Database comments: ${post.metrics?.comments}`);

          saveCustomUserPost(uid, {
            id: prefixedId,
            platform: platId,
            title: post.title,
            description: post.description || "",
            url: post.url,
            thumbnailUrl: post.thumbnailUrl,
            type: post.type,
            status: "active",
            privacyStatus: post.privacyStatus || "public",
            metrics: post.metrics,
            uesScore: post.uesScore,
            publishedAt: post.publishedAt,
            lastSyncedAt: new Date().toISOString(),
          });
        });

        // Sync local store against live API origin
        const isMockXResult = platId === "x" && liveIds.includes("mock-tweet-1");
        if (!isMockXResult) {
          try {
            syncCustomPostsWithLiveOrigin(uid, platId, liveIds);
          } catch {}
        }

        previousIdSet.forEach((prevId) => {
          if (!fetchedIdSet.has(prevId)) {
            deletedCount++;
          }
        });

        totalChecked += activePosts.length;
        totalNew += newCount;
        totalUpdated += updatedCount;
        totalDeleted += deletedCount;

        platformResults[platId] = {
          platformId: platId,
          status: "success",
          checkedCount: activePosts.length,
          newCount,
          updatedCount,
          deletedCount,
        };
      } catch (err: any) {
        console.warn(`[SyncEngine] Failure syncing ${platId}:`, err);
        platformResults[platId] = {
          platformId: platId,
          status: "failed",
          checkedCount: 0,
          newCount: 0,
          updatedCount: 0,
          deletedCount: 0,
          errorMessage: err.message || "Platform API error",
        };
      }
    });

    await Promise.all(syncTasks);

    const report: SyncReport = {
      timestamp: new Date().toISOString(),
      totalChecked,
      totalNew,
      totalUpdated,
      totalDeleted,
      platformResults,
    };

    return NextResponse.json({
      success: true,
      report,
      message: `Synced ${totalChecked} posts · ${totalNew} new · ${totalDeleted} deleted · ${totalUpdated} updated`,
    });
  } catch (error: any) {
    console.error("[SyncEngine] Error during full sync:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute complete cross-platform synchronization" },
      { status: 500 }
    );
  }
}
