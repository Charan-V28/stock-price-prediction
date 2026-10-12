# Signal — Stock Forecast Lab

A full-stack educational stock forecasting dashboard. The Next.js frontend renders an interactive chart, while a Node.js Route Handler fetches daily market history and trains a compact LSTM implemented from scratch in TypeScript.

## Run locally

```powershell
npm install
npm run dev
```

Without a market-data key the app uses deterministic **Simulation mode**, clearly labeled in the UI. This lets you explore the full dashboard without mistaking synthetic prices for real market data.

For daily closing history, create a free [Alpha Vantage API key](https://www.alphavantage.co/support/#api-key), then add it to `.env.local`:

```text
ALPHA_VANTAGE_API_KEY=your_key_here
NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
```

Restart the dev server after adding the key. Keep it server-side; do not put it in frontend code or commit it. Alpha Vantage's standard free tier has a daily request limit. This project uses daily closing data, not live quotes.

## Accounts: Google and email/password

Authentication is provided by Supabase Auth. The forecast dashboard remains public; sign-in is optional and currently provides a personal account session rather than private saved portfolios.

1. Create a Supabase project and copy its Project URL and publishable key from **Project Settings → API**.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local` (leave the Alpha Vantage key there too), then restart Next.js. These are the browser-safe project URL and publishable key; never add a Supabase service-role key to frontend or `NEXT_PUBLIC_` variables.
3. In Supabase **Authentication → Providers**, enable Email and Google. For Google, create a Web OAuth client in Google Cloud, then put its client ID and secret into Supabase’s Google provider settings. Google passwords are entered only on Google’s own consent page.
4. In Google Cloud, add the Supabase callback URL shown in the Google provider setup as an authorized redirect URI. In Supabase **Authentication → URL Configuration**, set the site URL to your local app while developing and add redirect URLs for `http://localhost:3000/**` and your Vercel domain (for example `https://your-project.vercel.app/**`).
5. Add both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to Vercel’s Environment Variables for Production and Preview, then redeploy. Keep Google’s OAuth client secret in the Supabase dashboard only.

Email confirmation is enabled by default for new Supabase projects. The built-in sender is rate-limited for testing; configure custom SMTP in Supabase before opening sign-ups to the public. Supabase confirmation, Google login, and password reset emails must use the allowed redirect URLs above.

## Deploy to Vercel

Import this folder as a Next.js project in Vercel, or run `vercel` from this directory. Add `ALPHA_VANTAGE_API_KEY` under the project's Environment Variables for Production and Preview, along with the Supabase URL and publishable key if using accounts, then deploy. The frontend and `/api/predict` backend deploy together as a Node.js serverless function.

Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS URL if you use a custom domain. Vercel's deployment host is used automatically when this is unset. After publishing, check `/robots.txt` and `/sitemap.xml`, then submit the sitemap in Google Search Console. The page metadata targets educational stock forecasting, LSTM, and time-series machine-learning searches; replace or expand these terms after validating them with your audience.

The market-data credential is read only in server code. Keep it in Vercel's server-side Environment Variables; do not prefix it with `NEXT_PUBLIC_`. The API validates ticker and horizon input and caches provider history and forecast responses briefly. Alpha Vantage still enforces its own account limits, so use platform rate limiting and monitor provider usage before sharing the site widely.

## API

`GET /api/predict?symbol=IBM&horizon=5`

Supported horizons are 5, 10, and 20 trading sessions. The API returns daily history, a forecast path, a heuristic 80% range, chronological holdout MAE, volatility, source, and data mode. Responses are CDN cached briefly.

The dashboard accepts ticker symbols and company names. Common companies are suggested from a built-in directory; less common company-name searches use Alpha Vantage `SYMBOL_SEARCH` and are cached for an hour. Those lookups share the API key’s request allowance. If Alpha Vantage rate-limits daily history, the app serves generated sample prices with a prominent simulation label so the chart and model walkthrough remain usable. Simulated prices are not market data.

## Model and limitations

The Node.js function fits a one-layer, 8-unit LSTM to standardized log returns, validates on the most recent chronological holdout, then iteratively predicts the next 5, 10, or 20 sessions. The LSTM and Adam optimizer are implemented in TypeScript. The uncertainty band is a historical-error heuristic, not a calibrated confidence interval. A short, noisy price series cannot reliably predict future prices; this output is for learning and research only, not investment advice.
