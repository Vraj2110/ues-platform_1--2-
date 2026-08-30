"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { AI_INSIGHTS } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { printMultiPageReport } from "@/lib/printReportHelper";

const WORKSHEETS = [
  {
    id: "audit",
    title: "📊 Full Performance Audit",
    prompt: "I want a complete audit of my overall social media performance.",
    desc: "Evaluate overall grades, trends, and platform metrics."
  },
  {
    id: "instagram",
    title: "📸 Instagram Hook Diagnostic",
    prompt: "Why did my Instagram score drop?",
    desc: "Analyze Instagram score dips and optimize hook retention."
  },
  {
    id: "focus",
    title: "🎯 Platform Focus Strategy",
    prompt: "Which platform should I focus on?",
    desc: "Compare channel efficiencies to prioritize growth."
  },
  {
    id: "predict",
    title: "🔮 7-Day UES Forecasting",
    prompt: "Predict my score next week",
    desc: "Predict UES ranges and identify next week's milestones."
  },
  {
    id: "format",
    title: "📝 Content Format Optimizer",
    prompt: "What content type performs best?",
    desc: "Identify winning posts and formats across all channels."
  }
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function InsightsClient() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `### 👋 Welcome to AI Insights!
I am your automated growth analyst. I evaluate your channel metrics, posting cadence, and historical content scores to deliver data-backed recommendations.

Ask me questions like:
* *Where is my content lagging?*
* *Why did my Instagram score drop?*
* *Which platform should I focus on?*
* *Predict my score next week*`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeWorksheet, setActiveWorksheet] = useState<string | null>(null);

  const [geminiKey, setGeminiKey] = useState("");
  const [hasServerKey, setHasServerKey] = useState(false);

  // Load key from localStorage on mount and check server key status
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("ues_gemini_api_key");
      if (savedKey) setGeminiKey(savedKey);
    }

    fetch("/api/ai/status")
      .then(res => res.json())
      .then(data => setHasServerKey(!!data.hasServerKey))
      .catch(err => console.error("Error checking AI status:", err));
  }, []);

  // Modal State for Generate Report
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportProgressText, setReportProgressText] = useState("");
  const [reportContent, setReportContent] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Loading text animator
  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const intervals = [1200, 2800];
    const timers = intervals.map((ms, idx) =>
      setTimeout(() => {
        setLoadingStep(idx + 1);
      }, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  // Inline Style Parser (handles **bold** and `code`)
  function parseInlineStyles(text: string) {
    const boldParts = text.split(/\*\*([^*]+)\*\*/g);
    return boldParts.flatMap((boldPart, boldIndex) => {
      if (boldIndex % 2 === 1) {
        return [
          <strong key={`b-${boldIndex}`} className="font-extrabold text-white font-display">
            {boldPart}
          </strong>
        ];
      }
      const codeParts = boldPart.split(/`([^`]+)`/g);
      return codeParts.map((codePart, codeIndex) => {
        if (codeIndex % 2 === 1) {
          return (
            <code key={`c-${boldIndex}-${codeIndex}`} className="px-1.5 py-0.5 rounded bg-teal-dark/60 border border-cyan-border/10 font-mono text-cyan-ues text-xs">
              {codePart}
            </code>
          );
        }
        return codePart;
      });
    });
  }

  // Robust Stateful Markdown Parser
  function renderMarkdown(text: string) {
    if (!text) return null;

    const rawLines = text.split("\n");
    const elements: React.ReactNode[] = [];
    
    let currentBlock: {
      type: "code" | "table" | "list" | "numlist" | "blockquote" | "paragraph" | null;
      content: string[];
      meta?: any;
    } = { type: null, content: [] };

    let keyCounter = 0;

    const flushBlock = (key: number) => {
      if (!currentBlock.type || currentBlock.content.length === 0) return null;

      const blockText = currentBlock.content.join("\n");
      const type = currentBlock.type;
      currentBlock = { type: null, content: [] };

      if (type === "code") {
        const codeLang = currentBlock.meta || "";
        return (
          <div key={key} className="my-4 rounded-xl overflow-hidden border border-cyan-border/20 bg-teal-dark/60 font-mono text-xs">
            <div className="flex justify-between items-center px-4 py-1.5 bg-[#0b191c]/80 border-b border-cyan-border/10 text-mint-700 select-none">
              <span>{codeLang || "code"}</span>
              <button
                type="button"
                onClick={(e) => {
                  navigator.clipboard.writeText(blockText);
                  const btn = e.currentTarget;
                  btn.textContent = "Copied!";
                  setTimeout(() => { btn.textContent = "Copy"; }, 2000);
                }}
                className="hover:text-cyan-ues transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-[#e2e8f0] leading-relaxed">
              <code>{blockText}</code>
            </pre>
          </div>
        );
      }

      if (type === "table") {
        const rows = blockText.split("\n").map(r => r.trim()).filter(r => r.startsWith("|") && r.endsWith("|"));
        if (rows.length === 0) return null;

        const headers = rows[0]
          .split("|")
          .slice(1, -1)
          .map(h => h.trim());

        let startIndex = 1;
        if (rows[1] && /^\|[\s-:]+\|/.test(rows[1])) {
          startIndex = 2;
        }

        const bodyRows = rows.slice(startIndex).map(row => 
          row
            .split("|")
            .slice(1, -1)
            .map(cell => cell.trim())
        );

        return (
          <div key={key} className="my-4 overflow-x-auto rounded-xl border border-cyan-border/20 bg-teal-surface/20 shadow-sm">
            <table className="min-w-full divide-y divide-cyan-border/10 text-xs">
              <thead className="bg-[#0b191c]/40">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left font-display font-semibold text-cyan-ues uppercase tracking-wider">
                      {parseInlineStyles(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-border/5 bg-teal-card/10">
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-teal-surface/30 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2.5 text-[#F7FFF7]/90 leading-relaxed">
                        {parseInlineStyles(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      if (type === "blockquote") {
        return (
          <blockquote key={key} className="border-l-2 border-cyan-ues pl-4 py-1.5 my-3 bg-cyan-light/[0.03] text-sm text-mint-700 italic rounded-r-xl">
            {parseInlineStyles(blockText)}
          </blockquote>
        );
      }

      if (type === "list") {
        return (
          <ul key={key} className="my-2.5 space-y-1.5">
            {currentBlock.content.map((item, i) => {
              const isSub = item.startsWith("  ") || item.startsWith("\t");
              const cleanItem = item.trim().replace(/^[*+-]\s+/, "");
              return (
                <li key={i} className={`flex gap-2 text-sm text-[#F7FFF7]/90 relative my-1.5 ${isSub ? "pl-8" : "pl-4"}`}>
                  <span className={`absolute ${isSub ? "left-5" : "left-1"} top-2.5 w-1.5 h-1.5 rounded-full ${isSub ? "border border-cyan-ues bg-transparent" : "bg-cyan-ues"}`} />
                  <span className="leading-relaxed">{parseInlineStyles(cleanItem)}</span>
                </li>
              );
            })}
          </ul>
        );
      }

      if (type === "numlist") {
        return (
          <ol key={key} className="my-2.5 space-y-1.5">
            {currentBlock.content.map((item, i) => {
              const numMatch = item.trim().match(/^(\d+)\.\s(.*)/);
              const isSub = item.startsWith("  ") || item.startsWith("\t");
              const num = numMatch ? numMatch[1] : (i + 1).toString();
              const text = numMatch ? numMatch[2] : item.trim();
              return (
                <li key={i} className={`flex gap-2 text-sm text-[#F7FFF7]/90 relative my-1.5 ${isSub ? "pl-8" : "pl-4"}`}>
                  <span className={`font-mono text-cyan-ues text-xs font-semibold ${isSub ? "pl-4" : ""}`}>{num}.</span>
                  <span className="leading-relaxed">{parseInlineStyles(text)}</span>
                </li>
              );
            })}
          </ol>
        );
      }

      return (
        <p key={key} className="text-sm text-[#F7FFF7]/95 leading-relaxed my-3 font-normal">
          {parseInlineStyles(blockText)}
        </p>
      );
    };

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        if (currentBlock.type === "code") {
          const block = flushBlock(keyCounter++);
          if (block) elements.push(block);
        } else {
          const block = flushBlock(keyCounter++);
          if (block) elements.push(block);
          currentBlock.type = "code";
          currentBlock.meta = trimmed.slice(3).trim();
        }
        continue;
      }

      if (currentBlock.type === "code") {
        currentBlock.content.push(line);
        continue;
      }

      if (!trimmed) {
        const block = flushBlock(keyCounter++);
        if (block) elements.push(block);
        continue;
      }

      if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("### ") || trimmed.startsWith("#### ")) {
        const block = flushBlock(keyCounter++);
        if (block) elements.push(block);

        let headerEl;
        if (trimmed.startsWith("#### ")) {
          headerEl = (
            <h5 key={keyCounter++} className="font-display font-bold text-xs uppercase tracking-wider mt-4 mb-2 text-cyan-ues">
              {parseInlineStyles(trimmed.slice(5))}
            </h5>
          );
        } else if (trimmed.startsWith("### ")) {
          headerEl = (
            <h4 key={keyCounter++} className="font-display font-bold text-[15px] mt-5 mb-2.5 text-white tracking-wide border-b border-cyan-border/5 pb-1">
              {parseInlineStyles(trimmed.slice(4))}
            </h4>
          );
        } else if (trimmed.startsWith("## ")) {
          headerEl = (
            <h3 key={keyCounter++} className="font-display font-extrabold text-base mt-6 mb-3.5 text-cyan-ues border-b border-cyan-border/10 pb-1.5">
              {parseInlineStyles(trimmed.slice(3))}
            </h3>
          );
        } else {
          headerEl = (
            <h2 key={keyCounter++} className="font-display font-black text-lg mt-7 mb-4.5 text-cyan-ues">
              {parseInlineStyles(trimmed.slice(2))}
            </h2>
          );
        }
        elements.push(headerEl);
        continue;
      }

      if (trimmed === "---") {
        const block = flushBlock(keyCounter++);
        if (block) elements.push(block);
        elements.push(<hr key={keyCounter++} className="border-cyan-border/10 my-4" />);
        continue;
      }

      if (trimmed.startsWith("> ")) {
        if (currentBlock.type !== "blockquote") {
          const block = flushBlock(keyCounter++);
          if (block) elements.push(block);
          currentBlock.type = "blockquote";
        }
        currentBlock.content.push(trimmed.slice(2));
        continue;
      }

      if (trimmed.startsWith("|")) {
        if (currentBlock.type !== "table") {
          const block = flushBlock(keyCounter++);
          if (block) elements.push(block);
          currentBlock.type = "table";
        }
        currentBlock.content.push(line);
        continue;
      }

      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        if (currentBlock.type !== "list") {
          const block = flushBlock(keyCounter++);
          if (block) elements.push(block);
          currentBlock.type = "list";
        }
        currentBlock.content.push(line);
        continue;
      }

      const numMatch = trimmed.match(/^\d+\.\s/);
      if (numMatch) {
        if (currentBlock.type !== "numlist") {
          const block = flushBlock(keyCounter++);
          if (block) elements.push(block);
          currentBlock.type = "numlist";
        }
        currentBlock.content.push(line);
        continue;
      }

      if (currentBlock.type !== "paragraph" && currentBlock.type !== null) {
        const block = flushBlock(keyCounter++);
        if (block) elements.push(block);
      }
      
      if (currentBlock.type === null) {
        currentBlock.type = "paragraph";
      }
      currentBlock.content.push(trimmed);
    }

    const lastBlock = flushBlock(keyCounter++);
    if (lastBlock) elements.push(lastBlock);

    return elements;
  }

  // Ask AI analyst
  const handleAsk = async (queryText: string, worksheetId: string | null = null) => {
    const text = queryText.trim();
    if (!text || loading) return;

    setInput("");
    setActiveWorksheet(worksheetId);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      let token = "";
      const user = auth.currentUser;
      if (user) {
        token = await user.getIdToken();
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
        },
        body: JSON.stringify({
          message: text,
          history: messages.slice(1), // Exclude welcome message
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to receive response from AI Analyst.");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Error:** Unable to contact AI analyst. Please try again. (${err.message})`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Generate executive report
  const handleGenerateReport = async () => {
    setReportModalOpen(true);
    setReportLoading(true);
    setReportProgress(0);
    setReportProgressText("Reading dashboard connections...");

    // Simulate progress loader
    const interval = setInterval(() => {
      setReportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        const next = prev + Math.floor(Math.random() * 15) + 5;
        if (next < 35) {
          setReportProgressText("Reading dashboard connections...");
        } else if (next < 70) {
          setReportProgressText("Evaluating historical post metrics...");
        } else {
          setReportProgressText("Formulating strategic growth plan...");
        }
        return next;
      });
    }, 400);

    try {
      let token = "";
      const user = auth.currentUser;
      if (user) {
        token = await user.getIdToken();
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
        },
        body: JSON.stringify({
          isReport: true,
        }),
      });

      if (!res.ok) {
        throw new Error("Unable to generate the report.");
      }

      const data = await res.json();
      clearInterval(interval);
      setReportProgress(100);
      setReportProgressText("Report generated successfully!");
      setReportContent(data.response);
      setReportLoading(false);
    } catch (err: any) {
      clearInterval(interval);
      setReportContent(`⚠️ **Error generating report:** ${err.message}`);
      setReportLoading(false);
    }
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(reportContent);
    alert("Report copied to clipboard!");
  };

  const handleDownloadPdf = () => {
    printMultiPageReport(reportContent);
  };

  const getLoadingText = () => {
    if (loadingStep === 0) return "📊 Aggregating cross-channel metrics...";
    if (loadingStep === 1) return "🤖 consulting Gemini 3.5 Analyst...";
    return "✨ Formatting strategic recommendations...";
  };

  const handleClearHistory = () => {
    setActiveWorksheet(null);
    setMessages([
      {
        role: "assistant",
        content: `### 👋 Chat history cleared.\nAsk a custom question below, or select a Growth Worksheet from the sidebar.`,
      },
    ]);
  };

  return (
    <div className="page-enter flex flex-col h-[calc(100vh-60px)] bg-teal-dark/5">
      {/* Title Header */}
      <div className="flex flex-col gap-2 px-9 pt-6 pb-4 border-b border-cyan-border/5 bg-teal-deep/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-extrabold text-2xl text-mint tracking-tight">AI Analyst Workspace</h1>
            <p className="text-xs text-mint-700 mt-0.5">Sleek multi-platform chat diagnostic and planning room</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClearHistory} className="text-xs border-cyan-border/25">
              Clear Chat
            </Button>
            <Button variant="pink" size="sm" onClick={handleGenerateReport}>
              ✨ Generate Report
            </Button>
          </div>
        </div>
      </div>

      {/* Main split pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side Pane - Worksheets & Topics */}
        <aside className="w-80 border-r border-cyan-border/10 bg-teal-deep/45 flex flex-col justify-between overflow-y-auto hidden md:flex">
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-ues mb-1">
                Growth Worksheets
              </p>
              <p className="text-[11px] text-mint-700 leading-normal">
                Choose a diagnostic worksheet to run mathematical projections on your synced channel data.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {WORKSHEETS.map((ws) => (
                <button
                  key={ws.id}
                  disabled={loading}
                  onClick={() => handleAsk(ws.prompt, ws.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-1 disabled:opacity-50 ${
                    activeWorksheet === ws.id
                      ? "bg-cyan-mid/15 border-cyan-ues text-white shadow-cyan-glow/5"
                      : "bg-teal-surface/20 border-cyan-border/8 text-mint-700 hover:bg-teal-surface/35 hover:border-cyan-border/15"
                  }`}
                >
                  <span className="text-xs font-semibold text-mint">{ws.title}</span>
                  <span className="text-[10px] text-mint-700/80 leading-normal">{ws.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Model indicator box */}
          <div className="p-5 border-t border-cyan-border/5 bg-teal-surface/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-mint">
              <span className={`w-2.5 h-2.5 rounded-full ${hasServerKey || geminiKey ? "bg-cyan-ues animate-pulse" : "bg-amber-500"}`} />
              {hasServerKey
                ? "Gemini 1.5 Flash (Server Active)"
                : geminiKey
                ? "Gemini 1.5 Flash (User Key)"
                : "Local Fallback Active"}
            </div>
            <p className="text-[10px] text-mint-700/80 leading-normal">
              {hasServerKey || geminiKey
                ? "Gemini AI is analyzing metrics and historical trends in real-time."
                : "Enter a Gemini API Key below to unlock live AI analysis of metrics and growth diagnostics."}
            </p>
            
            <div className="space-y-1.5 pt-1.5 border-t border-cyan-border/5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-ues flex items-center justify-between">
                <span>Gemini API Key</span>
                {geminiKey && (
                  <button 
                    onClick={() => {
                      setGeminiKey("");
                      localStorage.removeItem("ues_gemini_api_key");
                    }}
                    className="text-[9px] text-pink-ues hover:underline normal-case font-normal"
                  >
                    Clear
                  </button>
                )}
              </label>
              <input
                type="password"
                placeholder={hasServerKey ? "Using server key..." : "Paste Gemini API Key..."}
                value={geminiKey}
                disabled={hasServerKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  localStorage.setItem("ues_gemini_api_key", e.target.value);
                }}
                className="w-full bg-[#0b191c]/80 border border-cyan-border/20 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-ues text-mint placeholder:text-mint-700/40 disabled:opacity-50"
              />
            </div>
          </div>
        </aside>

        {/* Right Side Pane - Chat Thread */}
        <main className="flex-1 flex flex-col bg-teal-dark/5 overflow-hidden relative">
          {/* Channel Header */}
          <div className="px-6 py-3.5 border-b border-cyan-border/5 bg-teal-surface/20 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-mid to-teal flex items-center justify-center text-sm border border-cyan-border/15 shadow-md">
                🤖
              </div>
              <div>
                <h3 className="text-xs font-bold text-mint tracking-wide">UES Growth Analyst</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-ues mt-0.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-ues animate-pulse-dot" />
                  Online
                </div>
              </div>
            </div>
            <div className="text-[10px] text-mint-700/60 font-mono hidden sm:block">
              Context: 30 Days Portfolio Stats
            </div>
          </div>

          {/* Chat Messages viewport */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            <div className="max-w-3xl mx-auto w-full space-y-6">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3.5 ${
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  } w-full`}
                  style={{ justifyContent: msg.role === "user" ? "flex-start" : "flex-start" }}
                >
                  {msg.role === "assistant" ? (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-mid to-teal flex items-center justify-center flex-shrink-0 text-sm border border-cyan-border/20 shadow-md">
                      🤖
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-ues to-pink-glow flex items-center justify-center flex-shrink-0 text-[10px] font-extrabold border border-pink-border/20 shadow-md text-white">
                      ME
                    </div>
                  )}
                  <div
                    className={`rounded-2xl p-5 text-sm leading-relaxed shadow-card max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-teal-mid/30 to-teal-card/60 border border-cyan-border/30 text-white rounded-tr-none"
                        : "bg-teal-surface/65 border border-cyan-border/12 text-[#F7FFF7] rounded-tl-none"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="space-y-1">{renderMarkdown(msg.content)}</div>
                    ) : (
                      <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3.5 mr-auto items-center animate-pulse w-full">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-mid to-teal flex items-center justify-center flex-shrink-0 text-sm border border-cyan-border/20">
                    🤖
                  </div>
                  <div className="bg-teal-surface/65 border border-cyan-border/12 rounded-2xl rounded-tl-none px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-ues animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-ues animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-ues animate-bounce" style={{ animationDelay: "300ms" }} />
                      <span className="text-[11px] text-cyan-ues ml-2 font-mono">{getLoadingText()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={chatEndRef} />
          </div>

          {/* Footer Input Area */}
          <div className="p-4 border-t border-cyan-border/5 bg-teal-surface/10 flex-shrink-0">
            <div className="max-w-3xl mx-auto w-full">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk(input);
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a custom question (e.g., what is my instagram follower rightnow?)..."
                  className="w-full pl-6 pr-14 py-3 rounded-full bg-teal-dark border border-cyan-border/20 text-sm text-mint focus:outline-none focus:border-cyan-ues focus:ring-1 focus:ring-cyan-ues transition-all placeholder-mint-700/40 shadow-inner"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="absolute right-2 w-9 h-9 rounded-full bg-cyan-ues flex items-center justify-center text-teal-dark hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 shadow-md"
                >
                  <span className="text-lg font-bold leading-none">➔</span>
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* REPORT MODAL */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <Card className="w-full max-w-2xl border-cyan-border/40 shadow-cyan-glow bg-teal-deep max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-cyan-border/15 flex justify-between items-center bg-teal-dark">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>✨</span> Executive Performance Report
              </CardTitle>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-mint-700 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {reportLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-6">
                  <div className="relative w-20 h-20">
                    <span className="absolute inset-0 rounded-full border-4 border-cyan-border animate-ping opacity-30" />
                    <span className="absolute inset-0 rounded-full border-4 border-cyan-ues border-t-transparent animate-spin" />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">📈</span>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-mint">{reportProgressText}</p>
                    <div className="w-64 h-2 bg-teal-surface rounded-full overflow-hidden border border-cyan-border/10">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-ues to-pink-ues transition-all duration-300"
                        style={{ width: `${reportProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-mint-700">{reportProgress}% Complete</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 prose-invert">{renderMarkdown(reportContent)}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-cyan-border/15 bg-teal-dark flex justify-end gap-3">
              {!reportLoading && (
                <>
                  <Button variant="pink" size="sm" onClick={handleDownloadPdf}>
                    📥 Download Multi-Page PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCopyReport}>
                    Copy Report
                  </Button>
                </>
              )}
              <Button variant="primary" size="sm" onClick={() => setReportModalOpen(false)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
