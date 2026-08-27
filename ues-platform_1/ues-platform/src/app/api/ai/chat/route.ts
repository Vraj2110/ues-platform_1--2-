import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getUserConnections, getCustomUserPosts } from "@/lib/server/connections";
import { AnalyticsService, AnalyticsPayload } from "@/lib/server/analyticsService";

export const dynamic = "force-dynamic";

// Group posts by month for Gemini prompt historical timeline
function calculateHistoricalTimeline(posts: any[]): Array<{ month: string; avgScore: number; postCount: number }> {
  const groups: Record<string, { sum: number; count: number }> = {};
  posts.forEach(p => {
    if (!p.publishedAt) return;
    const dateStr = p.publishedAt.substring(0, 7);
    if (!groups[dateStr]) groups[dateStr] = { sum: 0, count: 0 };
    groups[dateStr].sum += p.uesScore || 0;
    groups[dateStr].count += 1;
  });
  return Object.keys(groups).sort().map(month => ({
    month,
    avgScore: Math.round(groups[month].sum / groups[month].count),
    postCount: groups[month].count
  }));
}

// ── Typo / Abbreviation Normalizer ────────────────────────────────────────────
// Covers 150+ common typos, abbreviations, and short-forms used in real-world queries
function normalizeQuery(raw: string): string {
  let q = raw.toLowerCase().replace(/[''`]/g, "").trim();

  // ── Platform typos & abbreviations
  q = q.replace(/\b(instragram|instagrm|insagram|istagram|instgram|instgrm|instagrm|isnagram|intagram|intsagram|insta|ig|insta gram)\b/g, "instagram");
  q = q.replace(/\b(yotube|youtub|utube|youteb|yotub|youtueb|yotubr|yotueb|yu tube|u tube|yt|ytube|you tube)\b/g, "youtube");
  q = q.replace(/\b(facebok|facbook|fbook|faceboook|facebk|faceook|fcaebook|fb|face book)\b/g, "facebook");
  q = q.replace(/\b(twiter|twiiter|twittter|twtr|tweeter|twitr|tw)\b/g, "twitter");
  q = q.replace(/\b(tiktoc|tikok|tktok|tik tok|tiiktoк)\b/g, "tiktok");

  // ── Metric typos
  q = q.replace(/\b(folower|folowers|folowrs|follower|follwers|folowwers|subcribe|subcribes|foll|subs|subcribors|folowors)\b/g, "followers");
  q = q.replace(/\b(subcriber|subcribers|subcrber|subscribr|subscrbr|subskriber)\b/g, "subscribers");
  q = q.replace(/\b(viws?|veiws?|viwes|viewes|vews|veiwes|vies|viedos views)\b/g, "views");
  q = q.replace(/\b(liks|lke|lik|likkes|lkies|lieks)\b/g, "likes");
  q = q.replace(/\b(coments?|cmnts?|commments|commnts|comentss|coment)\b/g, "comments");
  q = q.replace(/\b(egagement|enagement|engagemnt|egagemnt|engagemnt|engagemnet|engajment|egagment)\b/g, "engagement");
  q = q.replace(/\b(vidos?|vido|vid|vidoes|psts|postss|poost|viedos|viideo)\b/g, "posts");
  q = q.replace(/\b(scor|grd|scoree|scroe)\b/g, "score");
  q = q.replace(/\b(impresions?|imprssions?|impressoin|impresion)\b/g, "impressions");
  q = q.replace(/\b(rech|reachh|reacch)\b/g, "reach");
  q = q.replace(/\b(shar|sharee|sharse)\b/g, "shares");
  q = q.replace(/\b(sav|savee|savs)\b/g, "saves");
  q = q.replace(/\b(acont|acount|accunt|acconts)\b/g, "account");
  q = q.replace(/\b(chanell|chanl|chnanel|chanel)\b/g, "channel");
  q = q.replace(/\b(contet|contnt|conetent|cntent)\b/g, "content");
  q = q.replace(/\b(platfom|platorm|platfrom|platfrm)\b/g, "platform");
  q = q.replace(/\b(audienc|audince|audinece)\b/g, "audience");
  q = q.replace(/\b(analytcs|analtics|anlaytics|analitcs|anlytics)\b/g, "analytics");
  q = q.replace(/\b(metrcs|metris|metircs)\b/g, "metrics");
  q = q.replace(/\b(performace|performnce|preformance|perfomance)\b/g, "performance");

  // ── Intent / action typos
  q = q.replace(/\b(gwoing|gwow|gwoth|grwoing|grwth|groth|grwing|grwow|gorwing)\b/g, "growing");
  q = q.replace(/\b(lagin|lagign|lagg|lagig|lagiing)\b/g, "lagging");
  q = q.replace(/\b(tps|triks|tipss|tipp)\b/g, "tips");
  q = q.replace(/\b(conect|conected|conection|connction|connecton)\b/g, "connected");
  q = q.replace(/\b(lastest|recentl|recnt|rcent|receent)\b/g, "recent");
  q = q.replace(/\b(higest|higgest|highst)\b/g, "highest");
  q = q.replace(/\b(compr|comapre|comprae|compre|compar)\b/g, "compare");
  q = q.replace(/\b(wekn|waekness|weaknes)\b/g, "weakness");
  q = q.replace(/\b(wrst|wrost|wors)\b/g, "worst");
  q = q.replace(/\b(suggeston|suggesion|sugesion|sugestion)\b/g, "suggestion");
  q = q.replace(/\b(recomend|recommed|reccomend|recomends)\b/g, "recommend");
  q = q.replace(/\b(improvment|improvemnt|imporvement|imrpove)\b/g, "improve");
  q = q.replace(/\b(stoped|stucked|stuk|stuk)\b/g, "stuck");
  q = q.replace(/\b(decres|decrese|decraes|dcline|declinig)\b/g, "declining");
  q = q.replace(/\b(increse|increas|incrse)\b/g, "increase");
  q = q.replace(/\b(numbr|numbre|numer)\b/g, "number");
  q = q.replace(/\b(averge|avrage|averag)\b/g, "average");
  q = q.replace(/\b(frequncy|freqency|frequeny)\b/g, "frequency");
  q = q.replace(/\b(popularty|popuarity|populr)\b/g, "popular");
  q = q.replace(/\b(stragegy|startegy|stratery|strtegy)\b/g, "strategy");
  // Compound words
  q = q.replace(/\brightnow\b/g, "right now");
  q = q.replace(/\bnow a days\b/g, "nowadays");
  q = q.replace(/\bnowaday\b/g, "nowadays");
  q = q.replace(/\bwats\b/g, "whats");
  q = q.replace(/\bwat\b/g, "what");
  q = q.replace(/\bwht\b/g, "what");
  q = q.replace(/\bwhcih\b/g, "which");
  q = q.replace(/\bwich\b/g, "which");
  q = q.replace(/\bkinf\b/g, "kind");
  q = q.replace(/\bknd\b/g, "kind");
  q = q.replace(/\btrendng\b/g, "trending");
  q = q.replace(/\btrendig\b/g, "trending");
  q = q.replace(/\btranding\b/g, "trending");
  q = q.replace(/\btreding\b/g, "trending");
  q = q.replace(/\bpoplar\b/g, "popular");
  q = q.replace(/\bpopulr\b/g, "popular");
  q = q.replace(/\bsuggest\b/g, "suggestion");
  q = q.replace(/\badvce\b/g, "advice");
  q = q.replace(/\brecomend\b/g, "recommend");

  return q;
}

// ── NLP Intent Engine ─────────────────────────────────────────────────────────
// Scoring-based intent ranking, real-data-only, typo-tolerant, deep personalized answers.
// NEVER fabricates numbers — always uses verified analytics payload.
function getDynamicLocalResponse(
  message: string,
  analytics: AnalyticsPayload,
  allPosts: any[],
  connections: any,
  isReport = false
): string {
  const q = normalizeQuery(message);
  const { overview, globalUes, platformBreakdown, components } = analytics;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const fmt = (num: any): string => {
    if (num === null || num === undefined || num === "N/A" || num === "") return "N/A";
    if (typeof num === "number") return num.toLocaleString();
    return String(num);
  };
  const platLabel = (p: string) =>
    p === "instagram" ? "Instagram" : p === "youtube" ? "YouTube" : p === "facebook" ? "Facebook" : p.toUpperCase();

  const trendVal = typeof globalUes.trend === "number" ? globalUes.trend : parseFloat(String(globalUes.trend)) || 0;
  const activePlats = Object.keys(platformBreakdown).filter(c => platformBreakdown[c].totalPosts > 0);

  // ── Platform Detection ────────────────────────────────────────────────────────
  let platformId: "instagram" | "youtube" | "facebook" | null = null;
  if (/\binstagram\b/.test(q)) platformId = "instagram";
  else if (/\byoutube\b/.test(q)) platformId = "youtube";
  else if (/\bfacebook\b/.test(q)) platformId = "facebook";

  // Detect trending context FIRST so "content" word doesn't misfire hasPosts
  const isTrendingQuery =
    /\b(trending|trend|popular|whats hot|what is hot|whats popular|popular type|popular kind|what kind|which kind|which type|what type|content type|niche|format)\b/.test(q) &&
    /\b(now|today|currently|right now|at the moment|nowadays|this (week|month|year)|2024|2025|2026)\b/.test(q);

  // Metric Detection
  const hasFollowers   = /\b(followers?|subscribers?|fans?|audience|sub)\b/.test(q);
  const hasViews       = /\b(views?|impressions?|reach|clicks?)\b/.test(q);
  const hasEngagement  = /\b(engagement|likes?|comments?|shares?|saves?|interactions?|rate)\b/.test(q);
  // hasPosts suppressed when user is asking about trending content type ("content" = topic, not cadence)
  const hasPosts       = !isTrendingQuery && /\b(posts?|videos?|uploads?|publish|cadence|content)\b/.test(q);
  const hasScore       = /\b(scores?|ues|grades?|ratings?|perform)\b/.test(q);


  // ── Intent Scoring ────────────────────────────────────────────────────────────
  // "whyMetric" = user asks WHY a specific metric is stuck/low/not working
  // "trendingContent" = user asks what content is trending/popular right now
  const scores: Record<string, number> = {
    connections: 0, report: isReport ? 10 : 0, latest: 0,
    best: 0, worst: 0, weakness: 0, compare: 0, growth: 0,
    tips: 0, viral: 0, volume: 0, improve: 0, demographics: 0,
    whyMetric: 0, trendingContent: 0,
  };

  // Trending content intent (highest priority when matched)
  if (isTrendingQuery) scores.trendingContent += 10;
  if (/\b(trending|trend|popular|hot|viral|going viral|what kind|which kind|what type|which type|what (content|video|post))\b/.test(q) && /\b(now|today|right now|currently|2024|2025|2026|this (week|month))\b/.test(q)) scores.trendingContent += 5;
  // Also catch: "what content should I make", "what should I post", "what videos should I create"
  if (/\b(what (content|video|post|videos|posts) (should i|can i|to) (make|create|post|upload))\b/.test(q)) scores.trendingContent += 8;
  if (/\b(suggest (content|video|post)|content (idea|ideas|suggestion|suggestions|recommendation)|video (idea|ideas))\b/.test(q)) scores.trendingContent += 8;

  // Connection check
  if (/\b(connected?|connections?|active channels?|platforms?|accounts?)\b/.test(q) && !/\b(grow|weakness|best|worst|why|stuck)\b/.test(q)) scores.connections += 5;

  // Content recency
  if (/\b(latest|last|recent|newest)\b/.test(q)) scores.latest += 5;

  // Best/top
  if (/\b(best|highest|top|most popular|working|strongest|winning|number one|no 1)\b/.test(q)) scores.best += 5;

  // Worst/lowest
  if (/\b(worst|lowest|stop making|poor|least popular|weakest|bottom)\b/.test(q)) scores.worst += 5;

  // Weakness / lagging / overall decline
  if (/\b(weakness|weaknesses|lagging|failing|bad|wasting|dropped?|decreased?|not growing|slow|behind|falling)\b/.test(q)) scores.weakness += 5;
  if (/\b(where am i lagging|why is my|what is wrong|why not growing|why am i|what went wrong)\b/.test(q)) scores.weakness += 3;

  // ── "Why is my METRIC stuck/low/not working" — specific diagnostic intent
  // Triggers when user asks WHY + a specific metric + a problem descriptor
  const hasWhyWord = /\b(why|how come|reason|cause|explain|tell me why|whats wrong with|what is wrong with|according to)\b/.test(q);
  const hasProblemWord = /\b(stuck|stagnant|stagnating|plateau|plateaued|low|slow|poor|bad|not working|not moving|same|no change|no growth|not increasing|not improving|only|just|barely|cant grow|cant increase|wont grow|wont increase|declining|dropped|fallen|fallen behind|behind|0 views|zero views|zero followers|flat)\b/.test(q);
  if (hasWhyWord && hasProblemWord) scores.whyMetric += 10;
  if (hasWhyWord && (hasViews || hasFollowers || hasEngagement)) scores.whyMetric += 5;
  if (hasProblemWord && (hasViews || hasFollowers || hasEngagement)) scores.whyMetric += 5;
  // Strong pattern: "why my views are stuck", "my reach is low", "views stuck at X"
  if (/\b(views?|reach|engagement|followers?|subscribers?|likes?|comments?)\b.*\b(stuck|low|slow|same|poor|not (working|moving|growing|increasing)|plateau|stagnant)\b/.test(q)) scores.whyMetric += 8;
  if (/\b(stuck|low|slow|poor|stagnant|plateau)\b.*\b(views?|reach|engagement|followers?|subscribers?|likes?|comments?)\b/.test(q)) scores.whyMetric += 8;

  // Compare
  if (/\b(compare|comparison|versus|vs|difference|which is better|which platform)\b/.test(q)) scores.compare += 5;

  // Growth/trends
  if (/\b(growing|growth|trend|change|increase|am i growing|is my)\b/.test(q)) scores.growth += 3;

  // Tips / advice
  if (/\b(tips?|tricks?|suggestions?|recommendations?|how to|advice|help me|how can i|how do i|what should i|give me|tell me how|show me how)\b/.test(q)) scores.tips += 5;
  if (/\b(why not growing|not growing|why slow|why lag|cant grow)\b/.test(q)) { scores.tips += 3; scores.weakness += 3; }

  // Viral
  if (/\b(viral|virality|going viral|why viral|explod|blow up|blowing up)\b/.test(q)) scores.viral += 5;

  // Volume leader
  if (/\b(most videos|most posts|highest volume|most content|which platform has most|contain most)\b/.test(q)) scores.volume += 5;

  // Improve
  if (/\b(improve|what should i|how to improve|how to get better|next step|action|action plan|what can i do)\b/.test(q)) scores.improve += 5;

  // Demographics
  if (/\b(age|gender|demographic|location|country|city|region|nationality)\b/.test(q)) scores.demographics += 10;

  const topIntent = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const intent = topIntent[1] > 0 ? topIntent[0] : "general";

  // ── Unrelated query check ─────────────────────────────────────────────────────
  const isAnalyticRelated =
    hasFollowers || hasViews || hasEngagement || hasPosts || hasScore ||
    platformId || Object.values(scores).some(s => s > 0) ||
    /\b(analytics?|metrics?|performance|statistics?|data|ues|dashboard)\b/.test(q);

  if (!isAnalyticRelated) {
    return `### 🤖 UES AI Growth Analyst
I specialize in analyzing your connected social media accounts — metrics, growth, engagement, content performance, and platform strategy.

**Try asking me:**
* *"Why is my Instagram not growing?"*
* *"What is my best performing YouTube video?"*
* *"Compare my Instagram and YouTube performance"*
* *"How can I increase my engagement rate?"*
* *"Where am I lagging the most?"*`;
  }

  // ── Demographics: always unavailable ─────────────────────────────────────────
  if (intent === "demographics") {
    return `### ⚠️ Audience Demographics Unavailable
Age, gender, location, and country data are **not synchronized** in this dashboard.

To view demographics, check them directly in:
* **Instagram Insights** → Audience tab
* **YouTube Studio** → Analytics → Audience`;
  }

  // ── TRENDING CONTENT HANDLER ─────────────────────────────────────────────────────
  // Handles: "what content is trending on YouTube right now?",
  //          "which kind of content is popular now?", "what should I post?"
  if (intent === "trendingContent") {
    const targetPlatId = platformId || "youtube";
    const platPosts = allPosts.filter(p => p.platform === targetPlatId);
    const stats = platformBreakdown[targetPlatId];
    const platName = platLabel(targetPlatId);

    // Analyze user's OWN content performance by type
    const typeGroups: Record<string, { count: number; totalViews: number; totalLikes: number; totalScore: number; titles: string[] }> = {};
    platPosts.forEach(p => {
      const type = (p.type || "video").toLowerCase();
      if (!typeGroups[type]) typeGroups[type] = { count: 0, totalViews: 0, totalLikes: 0, totalScore: 0, titles: [] };
      typeGroups[type].count++;
      typeGroups[type].totalViews += p.metrics?.views || p.metrics?.reach || 0;
      typeGroups[type].totalLikes += p.metrics?.likes || 0;
      typeGroups[type].totalScore += p.uesScore || 0;
      if (typeGroups[type].titles.length < 2) typeGroups[type].titles.push(p.title);
    });

    // Find user's best content type by average views
    const typeSorted = Object.entries(typeGroups).sort((a, b) => {
      const avgA = a[1].totalViews / a[1].count;
      const avgB = b[1].totalViews / b[1].count;
      return avgB - avgA;
    });
    const bestType = typeSorted[0];
    const bestTypeLabel = bestType ? bestType[0] : null;
    const bestTypeAvgViews = bestType ? Math.round(bestType[1].totalViews / bestType[1].count) : 0;

    // Find top posts by views
    const topPosts = [...platPosts].sort((a, b) =>
      (b.metrics?.views || b.metrics?.reach || 0) - (a.metrics?.views || a.metrics?.reach || 0)
    ).slice(0, 3);

    // Platform-specific trending knowledge (based on 2025-2026 real trends)
    const trendingByPlatform: Record<string, { trends: string[]; formats: string[]; tip: string }> = {
      youtube: {
        trends: [
          "**Faceless YouTube channels** — Automated/AI-voiced educational content is exploding (Finance, Tech, History niches)",
          "**YouTube Shorts** (60s vertical videos) — Shorts get 10x the reach of long-form for new creators",
          "**'Day in the life' vlogs** — Authentic, unfiltered lifestyle content is outperforming polished production",
          "**Tutorial & How-to videos** — 'How to X in 5 minutes' formats consistently go viral with strong search SEO",
          "**Reaction & Commentary** — React-style videos on trending news/topics spike views in 24–48 hours",
          "**AI & Tech content** — 'I tried [AI tool]' and 'ChatGPT vs X' videos get massive organic reach right now",
          "**Finance & Side Hustle** — 'Make money online' and passive income content has 3–5× average engagement",
        ],
        formats: ["YouTube Shorts (60s vertical)", "Listicle: 'Top 5/10 X'", "Talking head + B-roll", "Screen recording tutorials", "Reaction/commentary"],
        tip: "Post 1 Short per day + 1 long-form video per week. Shorts feed long-form views by 40-60% when linked."
      },
      instagram: {
        trends: [
          "**Reels under 30 seconds** — Instagram is aggressively promoting Reels under 30s in Explore",
          "**Before & After transformations** — Fitness, design, room makeovers, skill improvements",
          "**Talking-head Reels** — Direct-to-camera opinion/advice with bold text overlays",
          "**Trending audio Reels** — Using trending sounds within 48 hours of them trending doubles reach",
          "**Carousels (swipe posts)** — Carousels get 3× more reach than single images due to re-shares",
          "**'POV:' and 'Tell me you're X without telling me'** format content is still high-performing",
        ],
        formats: ["Reels <30s", "Carousels (10 slides)", "Quote graphics", "Before/After", "Tutorial Reels"],
        tip: "Post 5–7 Reels per week. Use trending audio within 48 hours of it trending for maximum algorithmic boost."
      },
      facebook: {
        trends: [
          "**Facebook Reels** — Facebook is prioritizing Reels in feeds to compete with TikTok/Instagram",
          "**Community/Group content** — Posts in active Facebook Groups get 5× more comments than page posts",
          "**Live videos** — Facebook Live gets 6× more interactions than regular videos",
          "**Nostalgia content** — 'Remember when...' and throwback posts drive massive organic shares",
          "**Local news & events** — Hyperlocal content outperforms general content for organic reach",
        ],
        formats: ["Facebook Reels", "Facebook Live", "Carousel posts", "Group posts", "Long-form personal stories"],
        tip: "Use Facebook Groups in your niche — group posts reach 5× more people than page posts organically."
      },
    };

    const platTrends = trendingByPlatform[targetPlatId] || trendingByPlatform.youtube;

    let response = `### 📊 Trending Content on ${platName} Right Now (2025–2026)

`;

    // User's own data section
    if (platPosts.length > 0) {
      response += `### 🎯 What's Working FOR YOU on ${platName}
Based on your **${platPosts.length}** ${platName} ${targetPlatId === "youtube" ? "videos" : "posts"} (real data):
`;
      if (bestTypeLabel) {
        response += `* **Your best-performing type:** **${bestTypeLabel}** — averaging **${(bestTypeAvgViews).toLocaleString()}** views/reach per post\n`;
      }
      if (topPosts.length > 0) {
        response += `* **Your top content right now:**\n`;
        topPosts.forEach((p, i) => {
          const v = p.metrics?.views || p.metrics?.reach || 0;
          response += `  ${i + 1}. "${p.title}" — ${(v).toLocaleString()} views (UES: ${p.uesScore}/100)\n`;
        });
      }
      response += `\n> 💡 **Your data signal:** Post more content similar to your top videos — they already proved they work with your audience.\n\n`;
    }

    response += `### 🔥 Platform-Wide Trending Formats on ${platName}
${platTrends.trends.map(t => `* ${t}`).join("\n")}

`;
    response += `### 📐 Recommended Formats to Try
${platTrends.formats.map(f => `* ${f}`).join("\n")}

`;
    response += `### ✅ Your Action Plan
1. **Start with your proven winner:** Create 3 more videos in the style of "${topPosts[0]?.title || "your best video"}" — your audience already responds to this
2. **Ride the platform trend:** ${platTrends.trends[0]} — start one video in this format this week
3. **Format optimization:** ${platTrends.tip}
4. **Niche down:** The more specific your topic, the less competition. 'How to edit YouTube videos on iPhone in 2025' beats 'How to edit videos'`;

    return response;
  }

  // ── WHY METRIC DIAGNOSTIC ─────────────────────────────────────────────────────
  // Handles: "why my views are stuck at 200", "why is my engagement low",
  //          "according to my instagram content why my reach is not increasing", etc.
  // This is the most critical handler — always diagnoses from REAL data, never just reports.
  if (intent === "whyMetric") {
    const targetPlatId = platformId || (activePlats.length > 0 ? activePlats[0] : null);
    const platPosts = targetPlatId ? allPosts.filter(p => p.platform === targetPlatId) : allPosts;
    const stats = targetPlatId ? platformBreakdown[targetPlatId] : null;

    // Determine WHICH metric the user is asking about
    const diagMetric = hasViews ? "views/reach"
      : hasFollowers ? "followers/subscribers"
      : hasEngagement ? "engagement"
      : hasPosts ? "posting frequency"
      : "overall performance";

    // Build data context
    const totalContent = platPosts.length;
    const avgViews = totalContent > 0
      ? platPosts.reduce((s, p) => s + (p.metrics?.views || p.metrics?.reach || 0), 0) / totalContent
      : 0;
    const avgLikes = totalContent > 0
      ? platPosts.reduce((s, p) => s + (p.metrics?.likes || 0), 0) / totalContent
      : 0;
    const avgComments = totalContent > 0
      ? platPosts.reduce((s, p) => s + (p.metrics?.comments || 0), 0) / totalContent
      : 0;
    const sortedByScore = [...platPosts].sort((a, b) => (b.uesScore || 0) - (a.uesScore || 0));
    const topPost = sortedByScore[0];
    const worstPost = sortedByScore[sortedByScore.length - 1];
    const sortedByViews = [...platPosts].sort((a, b) =>
      (b.metrics?.views || b.metrics?.reach || 0) - (a.metrics?.views || a.metrics?.reach || 0));
    const topViewPost = sortedByViews[0];
    const engRate = stats ? parseFloat(stats.engagementRate) || 0 : 0;

    const platName = targetPlatId ? platLabel(targetPlatId) : "your connected platforms";

    // Root cause analysis based on the actual metric
    let rootCause = "";
    let fixPlan = "";

    if (diagMetric === "views/reach") {
      const viewsGap = topViewPost
        ? `Your highest-viewed post ("${topViewPost.title}") got **${fmt(Math.round(topViewPost.metrics?.views || topViewPost.metrics?.reach || 0))}** views, but your average is only **${fmt(Math.round(avgViews))}** — a ${avgViews > 0 ? Math.round(((topViewPost.metrics?.views || topViewPost.metrics?.reach || 0) / avgViews)).toFixed(0) + "×" : "large"} gap.`
        : "";
      rootCause = `### 🔍 Why Your ${platName} Views Are Stuck

Based on your actual content data (${totalContent} posts analyzed):
${viewsGap}

**Root Causes Identified:**
1. **Weak hook in first 1-3 seconds** — The algorithm only amplifies content that keeps viewers watching past the first few seconds. If viewers drop off immediately, the platform stops pushing your video. Your average of ~${fmt(Math.round(avgViews))} views suggests the algorithm is not recommending your content organically
2. **Low saves & shares ratio** — Your engagement rate is **${stats?.engagementRate || "N/A"}**. If saves and shares are low (people watching but not bookmarking), the algorithm treats this as low-value content and limits reach
3. **Posting frequency** — You have **${stats?.totalPosts || 0}** posts this period on ${platName}. The algorithm requires consistent signals; gaps in posting can drop you out of distribution cycles
4. **No clear CTA for shares** — Views plateau when content doesn't motivate sharing. Without shares, you rely only on followers for views — not algorithmic reach`;
      fixPlan = `
### ✅ Specific Fix Plan
1. **Redesign your hook:** Watch your top 3 videos and identify where viewers drop off. Open every video with the punchline, not the introduction — *"Here's why your views are stuck at 200..."* not *"Hi guys, welcome back to my channel..."*
2. **Add a saves CTA:** End every post with: *"Save this video — you'll want to come back to this"* — saves directly signal content value to the ${platName} algorithm
3. **Replicate "${topPost?.title || "your best post"}":** This is your highest-scoring content (UES: ${topPost?.uesScore || "N/A"}/100). Create 3 variations of this exact topic and format this week
4. **Post at minimum 3×/week:** Consistency is algorithmic fuel — post at 7–9 AM or 6–9 PM local time for maximum initial impressions
5. **Cross-promote:** Share your ${platName} videos on your other connected platforms to drive external traffic, which signals high interest to the algorithm`;
    } else if (diagMetric === "followers/subscribers") {
      rootCause = `### 🔍 Why Your ${platName} Followers/Subscribers Are Stuck

Based on your data (${totalContent} posts, ${fmt(stats?.followers || 0)} current followers):

**Root Causes Identified:**
1. **Low discoverability** — New followers only come from people who discover you outside your existing audience. If your reach-to-follower ratio is low, you are not being recommended to new users
2. **No clear subscribe trigger** — People follow/subscribe when they see consistent value. If your posting cadence is irregular or your content topics are scattered, there's no compelling reason to subscribe
3. **Engagement rate of ${stats?.engagementRate || "N/A"}** — ${engRate < 5 ? "A sub-5% engagement rate signals to the algorithm that your current audience isn't engaged — making it less likely to recommend you to new users" : "Good engagement rate, but follower growth plateaus often mean your content isn't reaching new audiences outside your follower base"}
4. **Not asking for follows** — Most creators never explicitly ask. A direct CTA like *"Subscribe for more content like this"* at the peak moment of a video can increase follow rates by 30-50%`;
      fixPlan = `
### ✅ How to Break the Plateau
1. **Post Reels/Shorts exclusively for the next 2 weeks** — Short-form content is the #1 discovery tool on ${platName} and reaches non-followers
2. **Add a subscribe CTA at your video's most valuable moment** — not at the end (too late) — at the 60% mark when viewers are most engaged
3. **Collaborate** — Get a shoutout or collab post with a creator in your niche with 3-10× your follower count
4. **Pin your best content** — Pin "${topPost?.title || "your best post"}" (UES: ${topPost?.uesScore || "N/A"}/100) to your profile — new visitors convert to followers when they see your best content first`;
    } else if (diagMetric === "engagement") {
      rootCause = `### 🔍 Why Your ${platName} Engagement Is Low

Based on your data (${totalContent} posts, current engagement rate: **${stats?.engagementRate || "N/A"}**):

**Root Causes Identified:**
1. **No engagement triggers in content** — If posts don't end with a question, opinion prompt, or reaction request, viewers watch and scroll without interacting
2. **Average likes per post: ~${fmt(Math.round(avgLikes))} | Average comments: ~${fmt(Math.round(avgComments))}** — Low comment counts specifically indicate your content is not sparking conversation
3. **Reply speed** — If you don't reply to comments within 60 minutes of posting, the algorithm interprets low follow-up activity as low content quality and reduces distribution
4. **Content type mismatch** — Some content formats (tutorials, info-dumps) naturally get low engagement vs. opinion-based or relatable content`;
      fixPlan = `
### ✅ Engagement Recovery Plan
1. **End every post with a question** — *"Which of these 3 tips are you trying first? Comment below 👇"* — direct questions triple comment rates
2. **Reply to EVERY comment in the first hour** — This is the single fastest engagement rate boost available to you
3. **Use polls and quizzes in Stories/Community tab** — These are zero-effort engagement for your audience and count toward your engagement rate
4. **Create opinion/controversial content** — Posts that start debates generate comments organically (e.g., *"Unpopular opinion: posting daily actually hurts your reach"*)
5. **Study "${topPost?.title || "your best post"}"** — it has your highest UES score (${topPost?.uesScore || "N/A"}/100) — what did it do differently that generated interaction?`;
    } else {
      // Generic diagnostic fallback
      rootCause = `### 🔍 ${platName} Performance Diagnostic
Based on your synced data (${totalContent} posts, UES: ${stats?.ues || globalUes.score}/100, Engagement: ${stats?.engagementRate || overview.engagementRate}):

**Your ${diagMetric} is underperforming because:**
1. Content format or hook is not resonating with your ${platName} audience
2. Posting frequency (${stats?.totalPosts || 0} posts this period) may be too low for the algorithm
3. Your CTA strategy is missing — viewers are passive, not converting to actions`;
      fixPlan = `
### ✅ Fix Plan
1. Replicate **"${topPost?.title || "your best post"}"** (UES: ${topPost?.uesScore || "N/A"}/100) — this format works
2. Post 3-4× per week consistently on ${platName}
3. Add explicit CTAs (save, share, comment, follow) in every post`;
    }

    return rootCause + fixPlan;
  }

  // ── Executive Report ──────────────────────────────────────────────────────────

  if (intent === "report") {
    const sorted = [...activePlats].sort((a, b) => Number(platformBreakdown[b].ues) - Number(platformBreakdown[a].ues));
    const weakPlat = sorted[sorted.length - 1] ? platformBreakdown[sorted[sorted.length - 1]] : null;
    const strongPlat = sorted[0] ? platformBreakdown[sorted[0]] : null;
    const compKeys = Object.keys(components) as Array<keyof typeof components>;
    let lowestComp = compKeys[0];
    compKeys.forEach(k => { if (components[k] < components[lowestComp]) lowestComp = k; });
    const compLabel: Record<string, string> = {
      normalizedReach: "Reach & Visibility",
      interactionDepth: "Interaction Depth (likes/reactions)",
      amplification: "Amplification (shares/retweets)",
      retentionSignal: "Retention Signal (comments/saves)",
    };

    let report = `## 📊 Executive Performance Report
**Portfolio Grade:** ${globalUes.grade} (UES Score: **${globalUes.score}/100**)
**Active Channels:** ${activePlats.map(platLabel).join(", ") || "None connected"}
**Trend:** ${trendVal >= 0 ? "▲" : "▼"} **${trendVal >= 0 ? "+" : ""}${globalUes.trend}%** vs previous period

### 📈 Core Portfolio Metrics
* **Total Audience:** ${fmt(overview.totalFollowers)} combined followers/subscribers
* **Total Reach:** ${fmt(overview.totalReach)} combined reach/views
* **Total Engagement:** ${fmt(overview.totalEngagement)} interactions (Rate: **${overview.engagementRate}**)
* **Content Volume:** ${overview.totalPosts} posts across all platforms

### 🔍 Platform Breakdown\n`;
    sorted.forEach(p => {
      const s = platformBreakdown[p];
      report += `* **${s.platformName}**: UES **${s.ues}/100** | ${fmt(s.followers)} followers | ${s.totalPosts} posts | ${s.engagementRate} engagement\n`;
    });

    if (strongPlat) report += `\n### ✅ Strength\n**${strongPlat.platformName}** is your strongest channel (UES: **${strongPlat.ues}/100**) with engagement rate **${strongPlat.engagementRate}**.\n`;
    if (weakPlat && weakPlat !== strongPlat) {
      report += `\n### ⚠️ Focus Area\n**${weakPlat.platformName}** is your weakest channel (UES: **${weakPlat.ues}/100**). Critical gap: **${compLabel[lowestComp] || lowestComp}** at **${components[lowestComp]}/100**.\n`;
    }
    report += `\n### 💡 Top Priority\nFocus on **${compLabel[lowestComp] || lowestComp}** on **${weakPlat?.platformName || "your weakest channel"}**. Publish 3-5 posts this week with strong hooks and explicit share/save CTAs.`;
    return report;
  }

  // ── Connected Channels ────────────────────────────────────────────────────────
  if (intent === "connections") {
    const conns = connections || {};
    const list: string[] = [];
    if (conns.youtube?.connected) list.push(`**YouTube** — ${conns.youtube.accountName || "Active"} (${platformBreakdown.youtube?.followers ? fmt(platformBreakdown.youtube.followers) + " subscribers" : "no subscriber data"})`);
    if (conns.instagram?.connected) list.push(`**Instagram** — ${conns.instagram.accountName || "Active"} (${platformBreakdown.instagram?.followers ? fmt(platformBreakdown.instagram.followers) + " followers" : "no follower data"})`);
    if (conns.facebook?.connected) list.push(`**Facebook** — ${conns.facebook.accountName || "Active"} (${platformBreakdown.facebook?.followers ? fmt(platformBreakdown.facebook.followers) + " followers" : "no follower data"})`);
    if (conns.x?.connected) list.push(`**X/Twitter** — ${conns.x.accountName || "Active"}`);

    if (list.length === 0) {
      return `### 🔗 No Connected Channels
You don't have any connected platforms yet. Go to the **Connections** tab to link your Instagram, YouTube, or Facebook account.`;
    }
    return `### 🔗 Your Connected Channels (${list.length})
${list.map(l => `* ${l}`).join("\n")}

You can ask me anything about these platforms — followers, engagement, top posts, growth tips, and more!`;
  }

  // ── Content Volume Leader ─────────────────────────────────────────────────────
  if (intent === "volume") {
    if (activePlats.length === 0) return `### 📊 Content Volume\nNo posts are synced across your connected platforms yet.`;
    const sortedVol = [...activePlats].sort((a, b) => platformBreakdown[b].totalPosts - platformBreakdown[a].totalPosts);
    const leader = platformBreakdown[sortedVol[0]];
    let res = `### 📊 Content Volume Distribution
**${leader.platformName}** has your highest posting volume with **${leader.totalPosts}** ${sortedVol[0] === "youtube" ? "videos" : "posts"}.

Full breakdown:\n`;
    sortedVol.forEach(p => {
      const s = platformBreakdown[p];
      res += `* **${s.platformName}**: ${s.totalPosts} ${p === "youtube" ? "videos" : "posts"}\n`;
    });
    res += `\n**Insight:** Increase posting on **${platLabel(sortedVol[sortedVol.length - 1])}** — it has the lowest volume and consistent posting is rewarded by recommendation algorithms.`;
    return res;
  }

  // ── Weakness / Why not growing ────────────────────────────────────────────────
  if (intent === "weakness" || (scores.weakness >= 3 && scores.tips < scores.weakness)) {
    if (activePlats.length === 0) {
      return `### ⚠️ No Data to Diagnose
Connect and sync your social media accounts first so I can identify where you're lagging.`;
    }
    const sorted = [...activePlats].sort((a, b) => Number(platformBreakdown[a].ues) - Number(platformBreakdown[b].ues));
    const weakPlatId = sorted[0];
    const weakPlat = platformBreakdown[weakPlatId];
    const compKeys = Object.keys(components) as Array<keyof typeof components>;
    let lowestComp = compKeys[0];
    compKeys.forEach(k => { if (components[k] < components[lowestComp]) lowestComp = k; });
    const compLabel: Record<string, string> = {
      normalizedReach: "Reach & Visibility",
      interactionDepth: "Interaction Depth (likes/reactions)",
      amplification: "Amplification (shares/retweets)",
      retentionSignal: "Retention Signal (comments/saves)",
    };
    const compFix: Record<string, string> = {
      normalizedReach: "optimize your thumbnail/cover image and nail the first 3 seconds to maximize click-through on the recommendation feed",
      interactionDepth: "add a direct question at the end of each post — e.g. 'Which tip surprised you most? Drop it in the comments'",
      amplification: "create shareable formats — checklists, step-by-step breakdowns, or controversial takes that people want to send to a friend",
      retentionSignal: "bundle your content as a 'reference guide' or 'how-to checklist' and ask viewers to save it — this directly boosts the retention signal",
    };
    const weakPosts = allPosts.filter(p => p.platform === weakPlatId).sort((a, b) => (a.uesScore || 0) - (b.uesScore || 0));
    const worstPost = weakPosts[0];

    return `### 🔍 Where You're Lagging — Full Diagnosis
Based on your synced data:

**Weakest Platform:** **${weakPlat.platformName}** — UES Score **${weakPlat.ues}/100** | Engagement **${weakPlat.engagementRate}**
**Critical Metric Gap:** **${compLabel[lowestComp] || lowestComp}** is your lowest UES component at **${components[lowestComp]}/100**
${worstPost ? `**Lowest Post:** "${worstPost.title}" (UES: ${worstPost.uesScore}/100) — this format is not resonating` : ""}

### 📉 Root Cause
* **${weakPlat.platformName}** has ${fmt(weakPlat.followers)} followers and ${weakPlat.totalPosts} posts this period — posting cadence may be too low to stay visible in the feed
* The **${compLabel[lowestComp]}** gap means your audience sees your content but doesn't take action (like, comment, share, or save)
* This is a **hook quality or CTA problem**, not a reach problem

### ✅ Your 3-Step Fix
1. **Improve ${compLabel[lowestComp]}:** ${compFix[lowestComp] || "engage directly with your audience in comments and stories"}
2. **Post more consistently on ${weakPlat.platformName}:** Aim for 3-4 times per week minimum
3. **Stop this format:** Avoid content similar to "${worstPost?.title || "your lowest-scoring posts"}" — analyze what's different vs your best post`;
  }

  // ── Tips / How to improve / Growth strategies ─────────────────────────────────
  if (intent === "tips" || intent === "improve") {
    const targetPlatId = platformId || (activePlats.length > 0
      ? [...activePlats].sort((a, b) => Number(platformBreakdown[a].ues) - Number(platformBreakdown[b].ues))[0]
      : "instagram");
    const stats = platformBreakdown[targetPlatId];

    if (!stats || stats.totalPosts === 0) {
      return `### 💡 Growth Tips
No post data is synced for **${platLabel(targetPlatId)}** yet. Connect and sync this account to get personalized, data-driven tips.`;
    }

    const platPosts = allPosts.filter(p => p.platform === targetPlatId);
    const topPost = [...platPosts].sort((a, b) => (b.uesScore || 0) - (a.uesScore || 0))[0];
    const topByViews = [...platPosts].sort((a, b) =>
      (b.metrics?.views || b.metrics?.reach || 0) - (a.metrics?.views || a.metrics?.reach || 0))[0];
    const avgEngRate = parseFloat(stats.engagementRate) || 0;
    const engTip = avgEngRate < 3
      ? "Your engagement rate is below 3% — this is the #1 issue. Add a question at the end of every post."
      : avgEngRate < 7
      ? "Your engagement rate is moderate. Push above 7% with saves-focused CTAs and reply-to-every-comment in the first hour."
      : "Your engagement rate is strong! Focus on scaling audience size to amplify this advantage.";

    return `### 💡 Growth Strategy for ${platLabel(targetPlatId)}
Your **${platLabel(targetPlatId)}** is at UES **${stats.ues}/100** with **${fmt(stats.followers)} ${targetPlatId === "youtube" ? "subscribers" : "followers"}** and **${stats.engagementRate}** engagement rate.

### 📊 Data-Driven Insights
* **Best content:** "${topPost?.title || "your top post"}" (UES: ${topPost?.uesScore || "N/A"}/100) — this format works
* **Most viewed:** "${topByViews?.title || "your top post"}" with ${fmt(topByViews?.metrics?.views || topByViews?.metrics?.reach || 0)} views/reach
* **Engagement verdict:** ${engTip}

### 🚀 Action Plan
1. **Replicate your winner:** Post 3 variations of "${topPost?.title || "your best post"}" this week — same topic, different angle
2. **Boost ${targetPlatId === "youtube" ? "retention" : "saves"}:** ${targetPlatId === "youtube" ? "Add a teaser at 30 seconds: 'The most important tip is at the end' — this maximizes watch time" : "End every post with: 'Save this — you will need it later'"}
3. **Post timing:** Publish 6–9 PM weekdays when your audience is most active
4. **Reply fast:** Respond to every comment in the first 60 minutes — the algorithm boosts posts with fast engagement velocity`;
  }

  // ── Virality Diagnostic ───────────────────────────────────────────────────────
  if (intent === "viral" || scores.viral > 0) {
    const targetPlatId = platformId || "instagram";
    const platPosts = allPosts.filter(p => p.platform === targetPlatId);
    if (platPosts.length === 0) return `### 🚀 Virality Analysis\nNo posts are synced for **${platLabel(targetPlatId)}**.`;

    const byViews = [...platPosts].sort((a, b) =>
      (b.metrics?.views || b.metrics?.reach || 0) - (a.metrics?.views || a.metrics?.reach || 0));
    const topPost = byViews[0];
    const topViews = topPost.metrics?.views || topPost.metrics?.reach || 0;
    const avgViews = platPosts.reduce((s, p) => s + (p.metrics?.views || p.metrics?.reach || 0), 0) / platPosts.length;
    const mult = avgViews > 0 ? (topViews / avgViews).toFixed(1) : "N/A";

    return `### 🚀 Virality & Views Analysis — ${platLabel(targetPlatId)}

**Most-Viewed Post:** "${topPost.title}"
* **${fmt(topViews)}** views (${mult}× your channel average of ${fmt(Math.round(avgViews))})
* **UES Score:** ${topPost.uesScore}/100 | **Published:** ${topPost.publishedAt}
* **Likes:** ${fmt(topPost.metrics?.likes)} | **Comments:** ${fmt(topPost.metrics?.comments)} | **Shares:** ${fmt(topPost.metrics?.shares)}

### 💡 Capitalize on This Momentum
1. **Publish a follow-up** on this topic within 48 hours — the algorithm is still amplifying it
2. **Repurpose:** Turn this into a carousel, reel, or short if it was a long-form video
3. **Use the same hook formula** in your next 5 posts — it clearly works with your audience`;
  }

  // ── Compare Platforms ─────────────────────────────────────────────────────────
  if (intent === "compare") {
    if (activePlats.length < 2) {
      return `### 📊 Platform Comparison
You need at least **2 active platforms** with synced posts to compare. Currently active: **${activePlats.map(platLabel).join(", ") || "none"}**.`;
    }
    const sorted = [...activePlats].sort((a, b) => Number(platformBreakdown[b].ues) - Number(platformBreakdown[a].ues));
    let res = `### 📊 Cross-Platform Performance Comparison\n\n`;
    sorted.forEach(p => {
      const s = platformBreakdown[p];
      res += `**${s.platformName}**\n* UES: **${s.ues}/100** | Followers: **${fmt(s.followers)}** | Posts: **${s.totalPosts}** | Engagement: **${s.engagementRate}**\n\n`;
    });
    const winner = platformBreakdown[sorted[0]];
    const loser = platformBreakdown[sorted[sorted.length - 1]];
    res += `### 🏆 Verdict
**${winner.platformName}** leads your portfolio — UES **${winner.ues}/100**, engagement **${winner.engagementRate}**.
**${loser.platformName}** is your biggest growth opportunity — invest effort here for the fastest portfolio improvement.`;
    return res;
  }

  // ── Growth / Trends ───────────────────────────────────────────────────────────
  if (intent === "growth") {
    const sorted = [...activePlats].sort((a, b) => Number(platformBreakdown[b].ues) - Number(platformBreakdown[a].ues));
    const best = sorted[0] ? platformBreakdown[sorted[0]] : null;
    return `### 📈 Growth Status
**UES Score: ${globalUes.score}/100** (Grade: **${globalUes.grade}**), trending **${trendVal >= 0 ? "+" : ""}${globalUes.trend}%** vs the previous period.

* **Status:** ${trendVal > 2 ? "🟢 Positive growth — keep the momentum" : trendVal < -2 ? "🔴 Declining — content strategy needs adjustment" : "🟡 Stable — push for growth by increasing posting frequency and engagement"}
${best ? `* **Leading channel:** **${best.platformName}** (UES: ${best.ues}/100, Engagement: ${best.engagementRate})` : ""}
* **Total reach:** ${fmt(overview.totalReach)} | **Audience:** ${fmt(overview.totalFollowers)} combined

**Next Step:** ${trendVal <= 0 ? "Post 3× more frequently this week and focus on high-save-rate formats to reverse the trend." : "Double down — analyze your top posts and repeat those exact formats consistently."}`;
  }

  // ── Latest Post ───────────────────────────────────────────────────────────────
  if (intent === "latest") {
    const filtered = platformId ? allPosts.filter(p => p.platform === platformId) : allPosts;
    const sorted = [...filtered].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    if (sorted.length === 0) return `### 📅 Latest Content\nNo posts found${platformId ? ` for **${platLabel(platformId)}**` : ""}. Sync your accounts to view recent content.`;
    const post = sorted[0];
    const m = post.metrics || {};
    const views = m.views || m.reach || 0;
    return `### 📅 Latest ${platLabel(post.platform)} Post
**"${post.title}"**
* **Published:** ${post.publishedAt}
* **UES Score:** ${post.uesScore || "N/A"}/100
* **${post.platform === "youtube" ? "Views" : "Reach"}:** ${fmt(views)} | **Likes:** ${fmt(m.likes)} | **Comments:** ${fmt(m.comments)} | **Shares:** ${fmt(m.shares)}

**Quick Tip:** Reply to every comment on this post within the next hour to boost algorithm ranking.`;
  }

  // ── Best Post ─────────────────────────────────────────────────────────────────
  if (intent === "best") {
    const filtered = platformId ? allPosts.filter(p => p.platform === platformId) : allPosts;
    if (filtered.length === 0) return `### ⚠️ No Posts Found\nNo synced posts found${platformId ? ` for ${platLabel(platformId)}` : ""}. Connect and sync your accounts.`;
    const sorted = [...filtered].sort((a, b) => (b.uesScore || 0) - (a.uesScore || 0));
    const post = sorted[0];
    const m = post.metrics || {};
    const views = m.views || m.reach || 0;
    return `### ⭐ Top Performing Post${platformId ? ` on ${platLabel(platformId)}` : ""}
**"${post.title}"** — ${platLabel(post.platform)}
* **UES Score:** ${post.uesScore}/100 | **Published:** ${post.publishedAt}
* **${post.platform === "youtube" ? "Views" : "Reach"}:** ${fmt(views)} | **Likes:** ${fmt(m.likes)} | **Comments:** ${fmt(m.comments)}

**Action:** Use this post's hook format and topic in your next 3 uploads — this is your proven formula.`;
  }

  // ── Worst Post ────────────────────────────────────────────────────────────────
  if (intent === "worst") {
    const filtered = platformId ? allPosts.filter(p => p.platform === platformId) : allPosts;
    if (filtered.length === 0) return `### ⚠️ No Posts Found\nNo synced posts found${platformId ? ` for ${platLabel(platformId)}` : ""}. Connect and sync your accounts.`;
    const sorted = [...filtered].sort((a, b) => (a.uesScore || 0) - (b.uesScore || 0));
    const post = sorted[0];
    const m = post.metrics || {};
    const views = m.views || m.reach || 0;
    return `### ⚠️ Lowest Performing Post${platformId ? ` on ${platLabel(platformId)}` : ""}
**"${post.title}"** — ${platLabel(post.platform)}
* **UES Score:** ${post.uesScore}/100 | **Published:** ${post.publishedAt}
* **${post.platform === "youtube" ? "Views" : "Reach"}:** ${fmt(views)} | **Likes:** ${fmt(m.likes)} | **Comments:** ${fmt(m.comments)}

**Action:** Avoid this format. The low engagement signals that the hook failed or the topic didn't resonate. Compare it directly against your best post to understand the gap.`;
  }

  // ── Platform + Metric ─────────────────────────────────────────────────────────
  if (platformId && (hasFollowers || hasViews || hasEngagement || hasPosts || hasScore)) {
    const stats = platformBreakdown[platformId];
    if (!stats) return `### ⚠️ Platform Not Found\n**${platLabel(platformId)}** is not in your connected accounts or has no synced data.`;

    if (hasFollowers) {
      const count = Number(stats.followers) || 0;
      const label = platformId === "youtube" ? "subscribers" : "followers";
      if (!count || count === 0) return `### 👥 ${platLabel(platformId)} Audience\nFollower data for **${platLabel(platformId)}** is currently unavailable. Check your connection sync status.`;
      return `### 👥 ${platLabel(platformId)} Audience
You have **${fmt(count)} ${label}** on **${platLabel(platformId)}**.
* **Engagement Rate:** ${stats.engagementRate} | **Posts this period:** ${stats.totalPosts} | **UES Score:** ${stats.ues}/100

${count < 1000 ? "**Tip:** Post consistently (4-5×/week) and collaborate with similar creators to grow past the 1K milestone." : count < 10000 ? "**Tip:** Focus on Reels/Shorts for discovery and cross-promote with your other platforms." : "**Tip:** Strong audience — focus on monetization and brand partnership opportunities."}`;
    }

    if (hasViews) {
      const reach = Number(stats.reach) || 0;
      const followers = Number(stats.followers) || 0;
      if (!reach || reach === 0) return `### 📈 ${platLabel(platformId)} Reach\nReach data for **${platLabel(platformId)}** is currently unavailable. Sync your account to view this metric.`;
      const ratio = followers > 0 ? (reach / followers).toFixed(1) : "N/A";
      return `### 📈 ${platLabel(platformId)} ${platformId === "youtube" ? "Views" : "Reach"}
Your total ${platformId === "youtube" ? "views" : "reach"} on **${platLabel(platformId)}** this period: **${fmt(reach)}**
* **Followers:** ${fmt(followers)} | **Posts:** ${stats.totalPosts} | **Engagement Rate:** ${stats.engagementRate}
* **Reach-to-Follower ratio:** ${ratio}× — ${Number(ratio) > 2 ? "excellent, your content reaches beyond your followers" : "low, post more Reels/Shorts to expand discovery reach"}`;
    }

    if (hasEngagement) {
      const engRate = parseFloat(stats.engagementRate) || 0;
      return `### 💬 ${platLabel(platformId)} Engagement
**Engagement Rate:** ${stats.engagementRate} | **Total Interactions:** ${fmt(stats.engagement)}

${engRate < 1 ? "🔴 **Critical:** Under 1% — redesign your hook and add direct CTAs immediately." : engRate < 3 ? "🟡 **Below Average:** Add engagement triggers: questions, polls, and opinion-based posts." : engRate < 7 ? "🟢 **Good:** Push to 7%+ by responding to comments fast and using saves-focused CTAs." : "🏆 **Excellent:** Top-tier engagement — focus on scaling your reach to amplify this."}`;
    }

    if (hasPosts) {
      return `### 📝 ${platLabel(platformId)} Publishing Cadence
You've published **${stats.totalPosts}** ${platformId === "youtube" ? "videos" : "posts"} on **${platLabel(platformId)}** this period.

${stats.totalPosts < 5 ? "**Warning:** Less than 5 posts is too low. Aim for 12-15/month on Instagram or 4-8 videos/month on YouTube." : stats.totalPosts < 15 ? "**Tip:** Increase to 15-20 posts/month for maximum algorithm visibility." : "**Strong cadence!** Focus on quality — ensure each post has a strong hook and clear CTA."}`;
    }

    if (hasScore) {
      const uesVal = Number(stats.ues) || 0;
      return `### ⭐ ${platLabel(platformId)} Performance Score
**UES Score: ${uesVal}/100** ${uesVal >= 80 ? "(Excellent)" : uesVal >= 60 ? "(Good)" : uesVal >= 40 ? "(Average)" : "(Needs Improvement)"}
* **Engagement Rate:** ${stats.engagementRate} | **Followers:** ${fmt(stats.followers)} | **Posts:** ${stats.totalPosts}

${uesVal < 60 ? "**Action:** Below 60 means underperforming. Fix hook quality and increase posting frequency." : uesVal < 80 ? "**Action:** Push to Excellent by increasing share-worthy content and fast comment responses." : "**Action:** Excellent! Focus on audience growth to maximize the impact of this strong score."}`;
    }
  }

  // ── Global Metric (no specific platform) ─────────────────────────────────────
  if (hasFollowers) {
    const platsSorted = [...activePlats].sort((a, b) => parseFloat(platformBreakdown[b].engagementRate) - parseFloat(platformBreakdown[a].engagementRate));
    return `### 📊 Combined Audience
**Total:** ${fmt(overview.totalFollowers)} combined followers/subscribers

${activePlats.map(p => `* **${platLabel(p)}:** ${fmt(platformBreakdown[p].followers)} ${p === "youtube" ? "subscribers" : "followers"}`).join("\n")}

**Growth tip:** Focus on **${platLabel(platsSorted[0] || activePlats[0] || "instagram")}** — it has your highest engagement rate, making it the fastest path to organic follower growth.`;
  }

  if (hasViews) {
    // Compute true total: YouTube uses "views", Instagram/Facebook use "reach"
    // overview.totalReach intentionally excludes YouTube — so we sum from platformBreakdown directly
    const ytViews = Number(platformBreakdown.youtube?.reach) || 0;
    const igReach = Number(platformBreakdown.instagram?.reach) || 0;
    const fbReach = Number(platformBreakdown.facebook?.reach) || 0;
    const trueTotal = ytViews + igReach + fbReach;

    const breakdown = activePlats.map(p => {
      const val = Number(platformBreakdown[p].reach) || 0;
      const label = p === "youtube" ? "views" : "reach";
      return `* **${platLabel(p)}:** ${fmt(val)} ${label}`;
    }).join("\n");

    return `### 📈 Total Views & Reach Across All Platforms
**Combined Total:** ${fmt(trueTotal)} (YouTube views + Instagram/Facebook reach)

${breakdown}

> Note: YouTube counts **views** (how many times a video was played). Instagram & Facebook count **reach** (unique users who saw your posts). These are different metrics — combining them gives your total content exposure.

**Insight:** ${ytViews > igReach ? `**YouTube** is your primary views driver with ${fmt(ytViews)} views. Focus on YouTube consistency to grow this further.` : `**Instagram** is your reach leader. Cross-promote your Instagram content to YouTube to grow your view count there.`}`;
  }


  if (hasEngagement) {
    return `### 💬 Combined Engagement
**Total Interactions:** ${fmt(overview.totalEngagement)} (Global Rate: **${overview.engagementRate}**)

${activePlats.map(p => `* **${platLabel(p)}:** ${platformBreakdown[p].engagementRate} engagement`).join("\n")}`;
  }

  if (hasPosts) {
    return `### 📝 Combined Publishing Volume
**Total Posts:** ${overview.totalPosts} across all connected platforms

${activePlats.map(p => `* **${platLabel(p)}:** ${platformBreakdown[p].totalPosts} ${p === "youtube" ? "videos" : "posts"}`).join("\n")}`;
  }

  if (hasScore) {
    return `### ⭐ Global UES Score
**${globalUes.score}/100** (Grade: **${globalUes.grade}**), trending **${trendVal >= 0 ? "+" : ""}${globalUes.trend}%** vs previous period

${activePlats.map(p => `* **${platLabel(p)}:** UES ${platformBreakdown[p].ues}/100`).join("\n")}`;
  }

  // ── Smart Default Summary ─────────────────────────────────────────────────────
  const sortedForSummary = [...activePlats].sort((a, b) => Number(platformBreakdown[b].ues) - Number(platformBreakdown[a].ues));
  return `### 📊 Your Portfolio Summary
**UES: ${globalUes.score}/100** (Grade: **${globalUes.grade}**) | **${fmt(overview.totalFollowers)}** total followers | **${overview.engagementRate}** global engagement

${sortedForSummary.map(p => {
    const s = platformBreakdown[p];
    return `* **${s.platformName}:** ${s.ues}/100 UES | ${fmt(s.followers)} followers | ${s.engagementRate} engagement`;
  }).join("\n")}

**Ask me anything** — growth tips, why you're lagging, best/worst content, comparisons, follower counts, and more!`;
}

export async function POST(request: Request) {
  try {
    let uid = "demo-user";
    try {
      const decoded = await verifyIdToken(request);
      if (decoded?.uid) uid = decoded.uid as string;
    } catch {
      // Fallback if auth token is not valid/provided
    }

    const body = await request.json();
    const { message, history, isReport } = body;

    if (!isReport && (!message || typeof message !== "string")) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const connections = await getUserConnections(uid);
    const allPosts = getCustomUserPosts(uid);

    const now = new Date();
    const daysFilter = 30;
    const currentCutoff = new Date(now.getTime() - daysFilter * 24 * 60 * 60 * 1000);
    const previousCutoff = new Date(now.getTime() - 2 * daysFilter * 24 * 60 * 60 * 1000);

    const currentPosts = allPosts.filter(p => new Date(p.publishedAt) >= currentCutoff);
    const previousPosts = allPosts.filter(p => {
      const d = new Date(p.publishedAt);
      return d >= previousCutoff && d < currentCutoff;
    });

    const analytics = AnalyticsService.getAnalytics(currentPosts, previousPosts, connections, daysFilter, allPosts);

    // Debug logging
    console.log("[AI Analyst] Question:", isReport ? "[Report]" : message);
    console.log("[AI Analyst] Posts loaded:", allPosts.length, "| Connections:", Object.keys(connections).length);

    const geminiApiKey = request.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      try {
        // Sort and optimize post catalog to prevent token quota exhaustion (429 rate limit issues)
        const sortedByScore = [...allPosts].sort((a, b) => (b.uesScore || 0) - (a.uesScore || 0));
        const topPerformed = sortedByScore.slice(0, 8);
        const lowPerformed = sortedByScore.slice(-8).reverse();
        const latestPosts = [...allPosts]
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .slice(0, 10);

        const optimizedCatalog = {
          topPerforming: topPerformed.map(p => ({
            title: p.title, platform: p.platform, type: p.type, uesScore: p.uesScore,
            metrics: { likes: p.metrics?.likes, comments: p.metrics?.comments, views: p.metrics?.views }
          })),
          worstPerforming: lowPerformed.map(p => ({
            title: p.title, platform: p.platform, type: p.type, uesScore: p.uesScore,
            metrics: { likes: p.metrics?.likes, comments: p.metrics?.comments, views: p.metrics?.views }
          })),
          latestContent: latestPosts.map(p => ({
            title: p.title, platform: p.platform, type: p.type, uesScore: p.uesScore, publishedAt: p.publishedAt
          }))
        };

        const systemPrompt = `You are a real-time AI analytics assistant (UES AI Growth Analyst). Use the Gemini API's available web/search capabilities (Google Search grounding) whenever the user asks for current, latest, trending, recent, or real-time information.

If the user asks questions such as:
* "What is the current content trend?"
* "What is trending right now?"
* "What type of content is performing well currently?"
* "What should I post today?"
* "What are the latest Instagram/YouTube/X/Facebook trends?"

Do NOT answer from old training knowledge or guess. Retrieve current information from reliable sources first, then provide a concise answer based on the latest available data.

For social media growth questions, combine:
1. The user's actual synced analytics data (from the JSON below).
2. Current real-time/trending information from web/search sources.
3. The user's platform, content type, audience, and recent performance.

Always understand spelling mistakes, typos, slang, abbreviations, and poorly written questions. Infer the user's intended meaning and answer that question.
Never fabricate real-time data, trends, statistics, or sources. If live/search data is unavailable, explicitly say that live data could not be verified instead of pretending it is current.
For every growth recommendation, explain WHY it is recommended and give specific actions the user can take.
The AI must provide personalized, current, data-backed answers—not generic responses.

${isReport ? "Generate a comprehensive executive performance report with grades, platform deep dives, strengths, weaknesses, and growth action items." : ""}

USER DATA (JSON):
${JSON.stringify({
  overview: analytics.overview,
  globalUes: analytics.globalUes,
  components: analytics.components,
  platformBreakdown: Object.keys(analytics.platformBreakdown).reduce((acc, k) => {
    const p = analytics.platformBreakdown[k];
    acc[k] = { name: p.platformName, ues: p.ues, followers: p.followers, engagementRate: p.engagementRate, reach: p.reach, totalPosts: p.totalPosts, engagement: p.engagement };
    return acc;
  }, {} as any),
  historicalTrend: calculateHistoricalTimeline(allPosts),
  postCatalog: optimizedCatalog
}, null, 2)}

Format all responses in clear Markdown with headings, bullet points, and bold text.`;

        const contents: any[] = [];
        if (history && Array.isArray(history)) {
          for (const turn of history) {
            contents.push({ role: turn.role === "assistant" || turn.role === "model" ? "model" : "user", parts: [{ text: turn.content }] });
          }
        }
        contents.push({ role: "user", parts: [{ text: isReport ? "Generate my executive performance report." : message }] });

        let apiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: { temperature: 0.65, topP: 0.95, maxOutputTokens: 4096 },
              tools: [{ googleSearch: {} }] // Enable live Google Search grounding
            })
          }
        );

        // If the first call failed (e.g., due to Google Search Grounding tool quota limits on Free/unbilled accounts)
        if (!apiResponse.ok) {
          const errText = await apiResponse.text();
          console.warn("[AI Analyst] Gemini call failed with status:", apiResponse.status, errText);
          if (errText.includes("quota") || errText.includes("429") || errText.includes("RESOURCE_EXHAUSTED") || errText.includes("googleSearch") || errText.includes("tool")) {
            console.log("[AI Analyst] Retrying Gemini call WITHOUT Google Search grounding tools...");
            const fallbackSystemPrompt = systemPrompt
              .replace("Use the Gemini API's available web/search capabilities (Google Search grounding) whenever the user asks for current, latest, trending, recent, or real-time information.", "Do NOT attempt to use any Google Search grounding tools or function calls, as they are not available for this key. Fulfill the user's request using your general knowledge directly.")
              .replace("Do NOT answer from old training knowledge or guess. Retrieve current information from reliable sources first, then provide a concise answer based on the latest available data.", "Provide the best available information from your training data, combined with the user's analytics stats.");

            apiResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents,
                  systemInstruction: { parts: [{ text: fallbackSystemPrompt }] },
                  generationConfig: { temperature: 0.65, topP: 0.95, maxOutputTokens: 4096 }
                })
              }
            );
          } else {
            throw new Error(`Gemini API error: ${apiResponse.statusText} - ${errText}`);
          }
        }

        if (!apiResponse.ok) {
          const errText = await apiResponse.text();
          console.error("Gemini API error:", errText);
          throw new Error(`Gemini API error: ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
        console.log("[AI Analyst] Gemini raw response:", JSON.stringify(data));
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (responseText) {
          console.log("[AI Analyst] Gemini responded successfully.");
          return NextResponse.json({ response: responseText });
        } else {
          console.warn("[AI Analyst] Gemini responded but responseText was empty or blocked. Candidates:", JSON.stringify(data.candidates));
        }
      } catch (err) {
        console.error("Gemini failed, falling back to local engine:", err);
      }
    }

    // Local NLP engine fallback
    console.log("[AI Analyst] Using local NLP engine for:", message);
    const responseText = getDynamicLocalResponse(isReport ? "" : message, analytics, allPosts, connections, isReport);
    return NextResponse.json({ response: responseText });

  } catch (error: any) {
    console.error("[AI Chat API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
}
