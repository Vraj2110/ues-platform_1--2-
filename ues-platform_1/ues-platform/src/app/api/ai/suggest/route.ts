import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getUserConnections, getCustomUserPosts } from "@/lib/server/connections";

export const dynamic = "force-dynamic";

// Local fallback templates for content generation
function getLocalFallback(mode: string, platform: string, type: string, topic: string, title: string, desc: string) {
  const t = topic || title || "Content Creation";
  const plat = platform.toLowerCase();

  if (mode === "ideas") {
    if (plat === "youtube") {
      return {
        ideas: [
          {
            title: `How to master ${t} in 2026 (Full Tutorial)`,
            hook: `Most tutorials on ${t} are outdated. Here is the exact 5-minute roadmap...`,
            description: `In this video, we break down step-by-step how to get started with ${t} using the latest tools. No experience required.`,
            tags: [t.toLowerCase(), "tutorial", "2026 guide", "how to"]
          },
          {
            title: `I tried ${t} for 30 Days (Here's what happened)`,
            hook: `I spent 30 days testing ${t} to see if it's actually worth it. The results surprised me.`,
            description: `An honest, unfiltered review of my 30-day experiment with ${t}. We cover the challenges, wins, and final results.`,
            tags: [t.toLowerCase(), "experiment", "30 days challenge", "review"]
          },
          {
            title: `The truth about ${t} nobody is telling you`,
            hook: `Everyone says ${t} is easy, but they are ignoring this one critical problem...`,
            description: `We expose the biggest myths surrounding ${t} and show you the actual reality of what it takes.`,
            tags: [t.toLowerCase(), "myths", "truth", "secrets"]
          }
        ]
      };
    } else if (plat === "instagram") {
      return {
        ideas: [
          {
            title: `3 Mistakes you're making with ${t} ❌`,
            hook: `Stop doing these 3 things if you want to succeed with ${t}...`,
            description: `Are you making these common ${t} mistakes? Check the comments to see how to fix them!`,
            tags: [t.toLowerCase(), "tips", "mistakes", "creator tips"]
          },
          {
            title: `How to start with ${t} in under 60 seconds`,
            hook: `Want to learn ${t}? Here is the absolute fastest way to start...`,
            description: `Quick breakdown of ${t} fundamentals. Save this Reel for later!`,
            tags: [t.toLowerCase(), "quick tutorial", "shorts", "reels"]
          },
          {
            title: `POV: You finally understand ${t} 🤯`,
            hook: `That moment when ${t} finally clicks...`,
            description: `It doesn't have to be complicated. Let me know in the comments if this makes sense!`,
            tags: [t.toLowerCase(), "pov", "relatable", "growth"]
          }
        ]
      };
    } else {
      // Facebook
      return {
        ideas: [
          {
            title: `Why ${t} is changing everything this year`,
            hook: `The landscape of ${t} is shifting rapidly. What are your thoughts on this?`,
            description: `Here is my take on the latest developments in ${t} and why it matters for creators.`,
            tags: [t.toLowerCase(), "discussion", "trends", "opinion"]
          },
          {
            title: `A quick checklist for anyone starting with ${t} today`,
            hook: `Before you do anything else with ${t}, make sure you tick these boxes:`,
            description: `A handy reference checklist for your workflow. Share with someone who needs this!`,
            tags: [t.toLowerCase(), "checklist", "guide", "value post"]
          },
          {
            title: `Behind the scenes of working on ${t}`,
            hook: `A sneak peek into my process for ${t}...`,
            description: `Building in public is the best way to learn. Let's discuss in the comments.`,
            tags: [t.toLowerCase(), "behind the scenes", "build in public", "update"]
          }
        ]
      };
    }
  }

  if (mode === "hooks") {
    const curTitle = title || `your ${platform} post`;
    return {
      hooks: [
        {
          text: `If you want to make progress with ${curTitle}, watch this first.`,
          type: "Attention Grabber"
        },
        {
          text: `This one simple change will completely transform how you view ${curTitle}.`,
          type: "Curiosity Loop"
        },
        {
          text: `Stop scrolling if you're trying to figure out ${curTitle}.`,
          type: "Pattern Interrupt"
        }
      ]
    };
  }

  // Optimize draft
  return {
    optimizedTitle: title ? `🚀 ${title}` : `How to master ${t}`,
    optimizedDescription: desc
      ? `${desc}\n\n---\n💡 Follow for daily insights and strategy tips!`
      : `Looking to improve your ${t}? Here is a quick guide.\n\n---\n💡 Follow for daily insights and strategy tips!`,
    suggestedTags: [t.toLowerCase().replace(/\s+/g, ""), platform, "trending", "analytics"],
    cta: `Double-tap if you agree and comment your thoughts below!`
  };
}

export async function POST(request: Request) {
  try {
    let uid = "demo-user";
    try {
      const decoded = await verifyIdToken(request);
      if (decoded?.uid) uid = decoded.uid as string;
    } catch {
      // Demo fallback
    }

    const body = await request.json();
    const { platform, type, currentTitle, currentDescription, topic, mode } = body;

    const targetPlatform = platform || "youtube";
    const targetType = type || "video";
    const targetMode = mode || "ideas";

    const allPosts = getCustomUserPosts(uid);
    // Find top posts for this platform to provide as context
    const topPosts = allPosts
      .filter(p => p.platform === targetPlatform)
      .sort((a, b) => {
        const aViews = a.metrics?.views || a.metrics?.reach || 0;
        const bViews = b.metrics?.views || b.metrics?.reach || 0;
        return bViews - aViews;
      })
      .slice(0, 3)
      .map(p => ({ title: p.title, views: p.metrics?.views || p.metrics?.reach || 0, score: p.uesScore }));

    const geminiApiKey = request.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      try {
        let systemPrompt = "";
        let userPrompt = "";

        if (targetMode === "ideas") {
          systemPrompt = `You are a professional content strategist. Generate 3 highly engaging, creative, and viral content ideas customized for ${targetPlatform} (${targetType} format) about the topic "${topic || "growth"}".
Provide hook ideas, title, description, and tags.`;
          
          if (topPosts.length > 0) {
            systemPrompt += `\n\nFor context, here are the user's top-performing posts on this platform previously:\n${JSON.stringify(topPosts)}`;
          }

          systemPrompt += `\n\nReturn ONLY a JSON object in this exact format:
{
  "ideas": [
    {
      "title": "Clear, clickable title",
      "hook": "Opening hook statement to grab attention",
      "description": "Short video description or caption draft",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}`;
          userPrompt = `Generate 3 ideas for topic: ${topic || "general content creation"}`;
        } else if (targetMode === "hooks") {
          systemPrompt = `You are a copywriting expert. Generate 3 high-converting opening hooks/titles for a post on ${targetPlatform} with the current title: "${currentTitle || "Untitled"}" and draft description: "${currentDescription || ""}".
Return ONLY a JSON object in this exact format:
{
  "hooks": [
    {
      "text": "Hook text...",
      "type": "E.g. Curiosity Hook, Question Hook, Pain Point Hook"
    }
  ]
}`;
          userPrompt = `Generate 3 hooks for: Title: "${currentTitle || ""}" Description: "${currentDescription || ""}"`;
        } else {
          // Optimize
          systemPrompt = `You are an SEO and optimization expert. Review the current title: "${currentTitle || "Untitled"}" and description: "${currentDescription || ""}" for ${targetPlatform} and return optimized versions, search tags, and an engaging Call to Action (CTA).
Return ONLY a JSON object in this exact format:
{
  "optimizedTitle": "...",
  "optimizedDescription": "...",
  "suggestedTags": ["tag1", "tag2"],
  "cta": "..."
}`;
          userPrompt = `Optimize title: "${currentTitle || ""}" and description: "${currentDescription || ""}"`;
        }

        const apiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: {
                temperature: 0.75,
                topP: 0.95,
                maxOutputTokens: 4096,
                responseMimeType: "application/json"
              }
            })
          }
        );

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            let jsonText = responseText.trim();
            if (jsonText.startsWith("```")) {
              jsonText = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
            }
            jsonText = jsonText.trim();
            try {
              const parsed = JSON.parse(jsonText);
              return NextResponse.json(parsed);
            } catch (jsonErr) {
              console.warn("[Suggest] Direct JSON.parse failed, attempting fallback boundary parsing. Raw output:", responseText);
              const startIdx = jsonText.indexOf("{");
              const endIdx = jsonText.lastIndexOf("}");
              if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                const subJson = jsonText.substring(startIdx, endIdx + 1);
                const parsed = JSON.parse(subJson);
                return NextResponse.json(parsed);
              }
              throw jsonErr;
            }
          }
        } else {
          const errText = await apiResponse.text();
          console.error("Gemini Suggest API error status:", apiResponse.status, errText);
        }
      } catch (err) {
        console.error("Gemini suggest call failed, using local fallback:", err);
      }
    }

    // Fallback to local suggestions
    const fallback = getLocalFallback(targetMode, targetPlatform, targetType, topic, currentTitle, currentDescription);
    return NextResponse.json(fallback);

  } catch (error: any) {
    console.error("[AI Suggest API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
}
