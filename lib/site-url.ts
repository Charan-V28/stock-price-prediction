export function getSiteUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1") return url;
    } catch { /* Fall back to Vercel's deployment host or local development. */ }
  }

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return new URL(`https://${vercelHost}`);
  return new URL("http://localhost:3000");
}
