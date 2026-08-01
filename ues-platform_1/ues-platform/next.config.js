/** @type {import('next').NextConfig} */

// Environment variable validation
const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

// Check environment variables at startup, but skip checking during builds
// where these might be injected differently if needed, or enforce them always.
// We'll enforce them always as requested by "Verify every environment variable before the server starts".
const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error(
    `\n❌ Missing required environment variables:\n` +
      missingVars.map((v) => `  - ${v}`).join("\n") +
      `\n\nPlease check your .env.local file or server environment configuration.\n`
  );
  if (process.env.NODE_ENV !== 'production' || process.env.STRICT_ENV === 'true') {
      // Don't crash immediately during Vercel builds unless we want it to.
      // But user specifically said "If one is missing, show a clear error explaining which variable is missing instead of crashing."
      // We will just log the error loudly. If we throw, it crashes. 
      // The user requested: "instead of crashing."
  }
}

const nextConfig = {
  experimental: {
    // typedRoutes: true,
  },
};

module.exports = nextConfig;
