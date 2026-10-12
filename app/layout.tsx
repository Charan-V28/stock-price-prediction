import type { Metadata, Viewport } from "next";
import { getSiteUrl } from "../lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "Signal — Stock Forecast Lab",
  description:
    "Explore historical stock data, interactive charts, and an educational LSTM stock forecast. Learn how a small model reads price history. Not investment advice.",
  applicationName: "Signal Forecast Lab",
  keywords: [
    "stock price prediction",
    "LSTM stock forecast",
    "stock forecasting demo",
    "time series machine learning",
    "educational finance data",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Signal Forecast Lab",
    title: "Signal — Stock Forecast Lab",
    description: "Explore market history and an educational LSTM forecast in an interactive lab.",
  },
  twitter: {
    card: "summary",
    title: "Signal — Stock Forecast Lab",
    description: "Explore market history and an educational LSTM forecast in an interactive lab.",
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
};

export const viewport: Viewport = {
  themeColor: "#080b0a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
