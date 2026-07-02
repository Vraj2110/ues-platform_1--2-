# UES Platform — Unified Engagement Scoring

A production-grade **Next.js 14 + TypeScript + Tailwind CSS** frontend for a cross-platform social media engagement analytics SaaS.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 14** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** |
| Charts | **Recharts** |
| Utilities | `clsx`, `tailwind-merge` |

---

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Mint Cream | `#F7FFF7` | Primary text, background |
| Grapefruit Pink | `#FF6B6B` | CTAs, warnings, accents |
| Strong Cyan | `#4ECDC4` | Primary brand, scores, links |
| Dark Teal | `#1A535C` | Cards, surfaces |
| Teal Dark | `#0f3238` | Page background |

---

## Project Structure

```
ues-platform/
├── src/
│   ├── app/
│   │   ├── (public)/          # Public marketing pages (with nav + footer)
│   │   │   ├── page.tsx       # Home
│   │   │   ├── features/      # Features page
│   │   │   ├── about/         # About page
│   │   │   └── contact/       # Contact page
│   │   ├── (auth)/            # Auth pages (split-panel layout)
│   │   │   ├── login/         # Login page
│   │   │   └── signup/        # Signup page
│   │   ├── (dashboard)/       # App pages (sidebar layout)
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── connect/       # Connect Platform
│   │   │   ├── posts/         # Posts list + Add Post
│   │   │   ├── score/         # Engagement Score breakdown
│   │   │   ├── analytics/     # Analytics & charts
│   │   │   ├── insights/      # AI Insights
│   │   │   └── profile/       # User profile & settings
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Root redirect
│   ├── components/
│   │   ├── ui/                # Reusable primitives
│   │   │   ├── Button.tsx     # Button (primary/pink/outline/ghost/danger)
│   │   │   ├── Input.tsx      # Input, Textarea, Select
│   │   │   ├── Card.tsx       # Card, CardHeader, CardTitle, CardSubtitle
│   │   │   ├── Badge.tsx      # Badge, ConnectedBadge, LiveDot
│   │   │   └── UESRing.tsx    # SVG score ring (sm/md/lg)
│   │   ├── layout/            # Layout components
│   │   │   ├── PublicNavbar.tsx
│   │   │   ├── PublicFooter.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── AuthLeftPanel.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── charts/            # Recharts wrappers
│   │   │   └── Charts.tsx     # UESTrendChart, PlatformTrendChart, ScoreBandChart, PlatformPieChart, PlatformBarChart
│   │   └── dashboard/         # Dashboard-specific components
│   │       ├── StatCard.tsx
│   │       ├── PlatformScoreRow.tsx
│   │       ├── PostRow.tsx
│   │       └── AIInsightCard.tsx
│   ├── lib/
│   │   ├── data.ts            # Mock data, constants, helpers
│   │   └── utils.ts           # cn() utility
│   ├── types/
│   │   └── index.ts           # All TypeScript types
│   └── styles/
│       └── globals.css        # Global styles, Tailwind directives, Recharts overrides
├── public/
├── tailwind.config.ts         # Full UES palette + custom tokens
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Build for production

```bash
npm run build
npm start
```

---

## Pages

### Public (with Navbar + Footer)
| Route | Description |
|-------|-------------|
| `/` | Home — hero, platform score visual, feature cards |
| `/features` | Full feature grid |
| `/about` | Project background, tech stack, research gaps |
| `/contact` | Contact form |

### Auth (split-panel layout)
| Route | Description |
|-------|-------------|
| `/login` | Email + social login |
| `/signup` | Create account form |

### App (sidebar layout — post login)
| Route | Description |
|-------|-------------|
| `/dashboard` | Stats, UES ring, trend chart, recent posts |
| `/connect` | Platform connector cards |
| `/posts` | Posts table with filters |
| `/posts/add` | Add post form with metric weights |
| `/score` | Full UES breakdown + component scores |
| `/analytics` | Trend charts, distribution, top posts |
| `/insights` | AI Analyst prompt + insight cards |
| `/profile` | Account settings, subscription |

---

## Key Design Decisions

- **Route groups** (`(public)`, `(auth)`, `(dashboard)`) give each section its own layout without affecting URLs
- **`cn()`** utility (clsx + tailwind-merge) handles conditional Tailwind classes cleanly
- **Recharts** is wrapped in `"use client"` components; all page-level components remain Server Components
- **Types** are centralized in `src/types/index.ts` for single source of truth
- **Mock data** lives in `src/lib/data.ts` — swap with real API calls

---

## Backend Integration Points

Replace mock data in `src/lib/data.ts` with real API calls:

```ts
// Example: fetch UES score from your FastAPI UES Engine
const uesScore = await fetch("http://api.uesplatform.io/v1/ues/score")
  .then(r => r.json());
```

The backend services described in the tech stack docs:
- **Node.js + Fastify** — main SaaS API (auth, user management)
- **Python + FastAPI** — UES Engine (normalization, scoring)
- **Python + FastAPI + LLM** — AI Analyst service
- **PostgreSQL** — persistent data
- **Redis** — score caching
