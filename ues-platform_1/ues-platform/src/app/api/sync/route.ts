import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getAllPlatformAdapters, BasePlatformSyncAdapter } from "@/lib/server/adapters";
import {
  getUserConnections,
  syncCustomPostsWithLiveOrigin,
  saveCustomUserPost,
  getCustomUserPosts,
  getDeletedPostIds,
  getAllUserIds,
} from "@/lib/server/connections";
import type { PlatformSyncResult, SyncReport } from "@/types";

export const dynamic = "force-dynamic";

// Helper function to execute synchronization for a single user
async function performSyncForUser(uid: string) {
  const connections = await getUserConnections(uid);
  const adapters = getAllPlatformAdapters();
  const deletedPostSet = await getDeletedPostIds(uid);

  let checkedCount = 0;
  let newCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
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
      const previousPosts = (await getCustomUserPosts(uid)).filter((p: any) => p.platform === platId);
      const previousIdSet = new Set(
        previousPosts.map((p: any) =>
          String(p.platformPostId || p.id).replace(/^(ig-live-|yt-live-|x-live-|fb-live-|ig-|yt-|x-|fb-)/, "")
        )
      );
      const fetchedIdSet = new Set(liveIds);

      let pNew = 0;
      let pUpdated = 0;
      let pDeleted = 0;

      const activePosts = fetchedPosts.filter((post) => {
        const rawId = post.platformPostId;
        const prefixedId = `${platId === "instagram" ? "ig" : platId === "x" ? "x" : platId === "facebook" ? "fb" : "yt"}-live-${rawId}`;
        return !deletedPostSet.has(prefixedId) && !deletedPostSet.has(rawId);
      });

      activePosts.forEach((post) => {
        const rawId = post.platformPostId;
        const prefixedId = `${platId === "instagram" ? "ig" : platId === "x" ? "x" : platId === "facebook" ? "fb" : "yt"}-live-${rawId}`;

        if (!previousIdSet.has(rawId)) {
          pNew++;
        } else {
          pUpdated++;
        }

        console.log(`[SyncEngine Debug] Updating Database for post ID: ${prefixedId} (User: ${uid})`);
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
          await syncCustomPostsWithLiveOrigin(uid, platId, liveIds);
        } catch {}
      }

      previousIdSet.forEach((prevId) => {
        if (!fetchedIdSet.has(prevId)) {
          pDeleted++;
        }
      });

      checkedCount += activePosts.length;
      newCount += pNew;
      updatedCount += pUpdated;
      deletedCount += pDeleted;

      platformResults[platId] = {
        platformId: platId,
        status: "success",
        checkedCount: activePosts.length,
        newCount: pNew,
        updatedCount: pUpdated,
        deletedCount: pDeleted,
      };
    } catch (err: any) {
      console.warn(`[SyncEngine] Failure syncing ${platId} for user ${uid}:`, err);
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

  return {
    checkedCount,
    newCount,
    updatedCount,
    deletedCount,
    platformResults,
  };
}

// POST: Triggered on-demand by the frontend client (for a single authenticated user)
export async function POST(request: Request) {
  try {
    const decoded = await verifyIdToken(request);
    const uid = (decoded as any)?.uid || "demo-user";

    const result = await performSyncForUser(uid);

    const report: SyncReport = {
      timestamp: new Date().toISOString(),
      totalChecked: result.checkedCount,
      totalNew: result.newCount,
      totalUpdated: result.updatedCount,
      totalDeleted: result.deletedCount,
      platformResults: result.platformResults,
    };

    return NextResponse.json({
      success: true,
      report,
      message: `Synced ${result.checkedCount} posts · ${result.newCount} new · ${result.deletedCount} deleted · ${result.updatedCount} updated`,
    });
  } catch (error: any) {
    console.error("[SyncEngine] Error during user sync:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute user synchronization" },
      { status: 500 }
    );
  }
}

// GET: Triggered by Vercel background cron job (securely syncs all active users every 2 hours)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");

    // Secure the cron handler against unauthorized calls in production
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retrieve all active user IDs that have platform connections
    const uids = await getAllUserIds();

    // Ensure we sync 'demo-user' as well for local testing
    if (!uids.includes("demo-user")) {
      uids.push("demo-user");
    }

    console.log(`[SyncEngine Cron] Starting background sync for ${uids.length} users:`, uids);

    let totalChecked = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    let totalDeleted = 0;
    const userReports: Record<string, any> = {};

    // Execute synchronization for each user (sequentially to prevent rate limits/concurrency exhaustion)
    for (const uid of uids) {
      try {
        const result = await performSyncForUser(uid);
        totalChecked += result.checkedCount;
        totalNew += result.newCount;
        totalUpdated += result.updatedCount;
        totalDeleted += result.deletedCount;
        userReports[uid] = {
          success: true,
          checked: result.checkedCount,
          new: result.newCount,
          updated: result.updatedCount,
          deleted: result.deletedCount,
        };
      } catch (err: any) {
        console.error(`[SyncEngine Cron] Failed to sync user ${uid}:`, err);
        userReports[uid] = {
          success: false,
          error: err.message || "User sync failed",
        };
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        usersCount: uids.length,
        totalChecked,
        totalNew,
        totalUpdated,
        totalDeleted,
      },
      details: userReports,
    });
  } catch (error: any) {
    console.error("[SyncEngine Cron] Cron execution failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Cron job synchronization failed" },
      { status: 500 }
    );
  }
}

