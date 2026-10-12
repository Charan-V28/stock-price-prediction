import { createForecast, HELP_URL } from "../../../lib/forecast";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") || "IBM").trim().toUpperCase();
  const horizonValue = url.searchParams.get("horizon") || "5";
  if (!/^(5|10|20)$/.test(horizonValue)) {
    return Response.json({ error: "Choose a forecast horizon of 5, 10, or 20 trading sessions." }, { status: 400 });
  }
  const horizon = Number(horizonValue);
  if (!/^[A-Z0-9.^_-]{1,15}$/.test(symbol)) {
    return Response.json({ error: "Enter a ticker symbol using letters, numbers, dots, or hyphens." }, { status: 400 });
  }
  try {
    const payload = await createForecast(symbol, horizon);
    return Response.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The model could not complete this forecast. Please try another ticker.";
    return Response.json({ error: message, helpUrl: HELP_URL }, { status: 502 });
  }
}
