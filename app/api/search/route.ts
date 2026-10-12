export const runtime = "nodejs";

type AlphaMatch = Record<string, string>;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 60) {
    return Response.json({ results: [], error: "Enter at least 2 characters to search companies." }, { status: 400 });
  }

  const key = process.env.ALPHA_VANTAGE_API_KEY?.trim();
  if (!key) {
    return Response.json({ results: [], error: "Company-name search needs a market-data key. You can still search the suggested companies or enter a ticker." }, { status: 503 });
  }

  try {
    const params = new URLSearchParams({ function: "SYMBOL_SEARCH", keywords: query, apikey: key });
    const response = await fetch(`https://www.alphavantage.co/query?${params}`, {
      headers: { Accept: "application/json", "User-Agent": "SignalForecastLab/1.0" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return Response.json({ results: [], error: "Company search is temporarily unavailable. Try entering the ticker symbol." }, { status: 502 });
    }
    const payload = await response.json() as { bestMatches?: AlphaMatch[]; Note?: string; Information?: string };
    if (!Array.isArray(payload.bestMatches)) {
      const providerMessage = `${payload.Note ?? ""} ${payload.Information ?? ""}`;
      if (/rate limit|call frequency|requests per (second|minute|day)|premium plans|thank you for using alpha vantage/i.test(providerMessage)) {
        return Response.json({ results: [], error: "The company-search daily limit has been reached. Try a suggested company or enter its ticker instead." }, { status: 429 });
      }
      return Response.json({ results: [], error: "No company matches were found. Check the name or try its ticker symbol." });
    }

    const results = payload.bestMatches
      .filter((match) => match["4. region"]?.toLowerCase() === "united states")
      .slice(0, 8)
      .map((match) => ({ symbol: match["1. symbol"], name: match["2. name"], type: match["3. type"] }))
      .filter((match) => /^[A-Z0-9.^_-]{1,15}$/i.test(match.symbol ?? "") && Boolean(match.name));
    return Response.json({ results }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return Response.json({ results: [], error: "Company search could not connect. Try again or enter the ticker symbol." }, { status: 502 });
  }
}
