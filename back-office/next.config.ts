import type { NextConfig } from "next";

/**
 * Ticket photos live in a public Supabase storage bucket, so next/image needs
 * that host allow-listed before it will serve them. The host comes from the
 * project URL rather than being written in, which means it follows the
 * environment — but it is read at build time, so changing Supabase projects
 * needs a rebuild, same as the NEXT_PUBLIC_ values themselves.
 */
function supabaseImagePatterns() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];

  try {
    const { hostname, protocol } = new URL(url);
    return [
      {
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    // A malformed URL is reported properly by lib/config.ts at request time.
    return [];
  }
}

const nextConfig: NextConfig = {
  // Pin the workspace root. Without it, Turbopack walks up past the repo
  // looking for a lockfile and warns about one in the home directory.
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    remotePatterns: supabaseImagePatterns(),
  },
};

export default nextConfig;
