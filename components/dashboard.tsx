"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  Database,
  Info,
  LoaderCircle,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApiError, ForecastResponse, Point } from "../lib/types";

const WATCHLIST = ["IBM", "AAPL", "MSFT", "NVDA", "TSLA"];
const COMPANY_NAMES: Record<string, string> = { IBM: "IBM", AAPL: "Apple", MSFT: "Microsoft", NVDA: "NVIDIA", TSLA: "Tesla" };
const PERIODS = ["1M", "3M", "MAX"] as const;
type Period = (typeof PERIODS)[number];

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value < 10 ? 2 : 2,
  }).format(value);
}

function compactMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function shortDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function longDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function initials(symbol: string) {
  return symbol.replace(/[^A-Z]/g, "").slice(0, 2) || "ST";
}

function Chart({
  history,
  forecast,
  currency,
  selected,
  onSelect,
}: {
  history: Point[];
  forecast: ForecastResponse["forecast"];
  currency: string;
  selected: Period;
  onSelect: (value: Period) => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const historicCount = history.length;
  const combined = useMemo(
    () => [...history, ...forecast.map((point) => ({ date: point.date, close: point.price }))],
    [history, forecast],
  );
  const bandValues = [...history.map((point) => point.close), ...forecast.flatMap((p) => [p.low, p.high])];
  const min = Math.min(...bandValues) * 0.985;
  const max = Math.max(...bandValues) * 1.015;
  const width = 1000;
  const height = 365;
  const left = 78;
  const right = 986;
  const top = 24;
  const bottom = 312;
  const x = (index: number) => left + (index / Math.max(1, combined.length - 1)) * (right - left);
  const y = (value: number) => top + ((max - value) / Math.max(0.001, max - min)) * (bottom - top);
  const historicalPath = history.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.close)}`).join(" ");
  const forecastPath = [
    `M${x(historicCount - 1)},${y(history[historicCount - 1].close)}`,
    ...forecast.map((point, index) => `L${x(historicCount + index)},${y(point.price)}`),
  ].join(" ");
  const upper = forecast.map((point, index) => `${x(historicCount + index)},${y(point.high)}`);
  const lower = [...forecast]
    .reverse()
    .map((point, index) => `${x(historicCount + forecast.length - 1 - index)},${y(point.low)}`);
  const bandPath = forecast.length ? `${upper.join(" ")} ${lower.join(" ")}` : "";
  const gridValues = Array.from({ length: 5 }, (_, index) => max - ((max - min) / 4) * index);
  const visibleHistory = selected === "1M" ? history.slice(-22) : selected === "3M" ? history.slice(-66) : history;
  const visibleForecast = forecast;
  const visible = [...visibleHistory, ...visibleForecast.map((point) => ({ date: point.date, close: point.price }))];
  const viewHistoryCount = visibleHistory.length;
  const viewValues = [...visibleHistory.map((point) => point.close), ...visibleForecast.flatMap((p) => [p.low, p.high])];
  const viewMin = Math.min(...viewValues) * 0.985;
  const viewMax = Math.max(...viewValues) * 1.015;
  const vx = (index: number) => left + (index / Math.max(1, visible.length - 1)) * (right - left);
  const vy = (value: number) => top + ((viewMax - value) / Math.max(0.001, viewMax - viewMin)) * (bottom - top);
  const viewHistoryPath = visibleHistory.map((point, index) => `${index === 0 ? "M" : "L"}${vx(index)},${vy(point.close)}`).join(" ");
  const viewForecastPath = [
    `M${vx(viewHistoryCount - 1)},${vy(visibleHistory[viewHistoryCount - 1].close)}`,
    ...visibleForecast.map((point, index) => `L${vx(viewHistoryCount + index)},${vy(point.price)}`),
  ].join(" ");
  const viewBand = [
    ...visibleForecast.map((point, index) => `${vx(viewHistoryCount + index)},${vy(point.high)}`),
    ...[...visibleForecast].reverse().map((point, index) => `${vx(viewHistoryCount + visibleForecast.length - 1 - index)},${vy(point.low)}`),
  ].join(" ");
  const viewGrid = Array.from({ length: 5 }, (_, index) => viewMax - ((viewMax - viewMin) / 4) * index);
  const tooltipPoint = hoverIndex === null ? null : visible[hoverIndex];

  function trackPointer(event: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const local = ((event.clientX - rect.left) / rect.width) * width;
    const ratio = Math.max(0, Math.min(1, (local - left) / (right - left)));
    setHoverIndex(Math.round(ratio * (visible.length - 1)));
  }

  return (
    <div className="chart-shell">
      <div className="chart-controls">
        <div className="chart-legend">
          <span><i className="legend-dot actual" /> Historical</span>
          <span><i className="legend-dot projected" /> LSTM projection</span>
          <span><i className="legend-band" /> 80% range</span>
        </div>
        <div className="periods" aria-label="Chart period">
          {PERIODS.map((period) => (
            <button className={selected === period ? "period active" : "period"} key={period} onClick={() => onSelect(period)}>
              {period}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-area">
        <svg
          ref={svgRef}
          className="price-chart"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Historical prices and model forecast chart"
          onMouseMove={trackPointer}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="historyFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c7ff56" stopOpacity=".16" />
              <stop offset="100%" stopColor="#c7ff56" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="bandFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#b9f84a" stopOpacity=".14" />
              <stop offset="100%" stopColor="#b9f84a" stopOpacity=".025" />
            </linearGradient>
          </defs>
          {viewGrid.map((value, index) => (
            <g key={index}>
              <line x1={left} x2={right} y1={top + ((bottom - top) / 4) * index} y2={top + ((bottom - top) / 4) * index} className="chart-grid" />
              <text x={left - 12} y={top + ((bottom - top) / 4) * index + 4} textAnchor="end" className="chart-label">
                {compactMoney(value, currency)}
              </text>
            </g>
          ))}
          <line x1={vx(viewHistoryCount - 1)} x2={vx(viewHistoryCount - 1)} y1={top} y2={bottom} className="forecast-divider" />
          <path d={`${viewHistoryPath} L${vx(viewHistoryCount - 1)},${bottom} L${left},${bottom} Z`} fill="url(#historyFill)" />
          <polygon points={viewBand} fill="url(#bandFill)" />
          <path d={viewHistoryPath} className="history-line" />
          <path d={viewForecastPath} className="forecast-line" />
          <circle cx={vx(viewHistoryCount - 1)} cy={vy(visibleHistory[viewHistoryCount - 1].close)} r="5" className="last-dot" />
          {hoverIndex !== null && tooltipPoint && (
            <g className="chart-crosshair">
              <line x1={vx(hoverIndex)} x2={vx(hoverIndex)} y1={top} y2={bottom} />
              <circle cx={vx(hoverIndex)} cy={vy(tooltipPoint.close)} r="4" />
            </g>
          )}
          {visible.filter((_, index) => index === 0 || index === viewHistoryCount - 1 || index === visible.length - 1 || (index < viewHistoryCount && index % Math.max(1, Math.floor(viewHistoryCount / 4)) === 0)).map((point, index) => {
            const actualIndex = visible.indexOf(point);
            return <text key={`${point.date}-${index}`} x={vx(actualIndex)} y={bottom + 27} textAnchor="middle" className="chart-label">{shortDate(point.date)}</text>;
          })}
        </svg>
        {tooltipPoint && hoverIndex !== null && (
          <div className="chart-tooltip" style={{ left: `${Math.max(10, Math.min(83, (hoverIndex / Math.max(1, visible.length - 1)) * 100))}%` }}>
            <span>{longDate(tooltipPoint.date)}</span>
            <strong>{money(tooltipPoint.close, currency)}</strong>
            {hoverIndex >= viewHistoryCount && <small>Model estimate</small>}
          </div>
        )}
      </div>
      <div className="chart-footnote">
        <span><Clock3 size={13} /> Historical bars through {shortDate(history[history.length - 1].date)}</span>
        <span>Forecast is a model estimate, not a target</span>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="loading-state">
      <LoaderCircle size={28} className="spinner" />
      <strong>Training the model</strong>
      <span>Fetching daily history and fitting the LSTM forecast…</span>
    </div>
  );
}

export default function Dashboard() {
  const [symbol, setSymbol] = useState("IBM");
  const [query, setQuery] = useState("IBM");
  const [horizon, setHorizon] = useState(5);
  const [period, setPeriod] = useState<Period>("3M");
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [watchlist, setWatchlist] = useState(WATCHLIST);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addTickerOpen, setAddTickerOpen] = useState(false);
  const [tickerDraft, setTickerDraft] = useState("");
  const [tickerError, setTickerError] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: number; title: string; detail: string; error?: boolean }>>([]);

  const load = useCallback(async (nextSymbol: string, nextHorizon: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/predict?symbol=${encodeURIComponent(nextSymbol)}&horizon=${nextHorizon}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ForecastResponse | ApiError;
      if (!response.ok) throw new Error("error" in payload ? payload.error : "The forecast could not be generated.");
      setData(payload as ForecastResponse);
      setSymbol((payload as ForecastResponse).symbol);
      setQuery((payload as ForecastResponse).symbol);
      setNotifications((current) => [{ id: Date.now(), title: `${(payload as ForecastResponse).symbol} forecast ready`, detail: `${nextHorizon} sessions · data through ${(payload as ForecastResponse).lastDate}` }, ...current].slice(0, 8));
    } catch (requestError) {
      setData(null);
      const message = requestError instanceof Error ? requestError.message : "Something went wrong. Please try again.";
      setError(message);
      setNotifications((current) => [{ id: Date.now(), title: `${nextSymbol} forecast failed`, detail: message, error: true }, ...current].slice(0, 8));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let defaultHorizon = 5;
    try {
      const savedWatchlist = localStorage.getItem("signal.watchlist.v1");
      if (savedWatchlist) {
        const parsed: unknown = JSON.parse(savedWatchlist);
        if (Array.isArray(parsed) && parsed.length <= 12 && parsed.every((item) => typeof item === "string" && /^[A-Z0-9.^_-]{1,15}$/.test(item))) setWatchlist(parsed);
      }
      const savedHorizon = Number(localStorage.getItem("signal.defaultHorizon.v1"));
      if ([5, 10, 20].includes(savedHorizon)) defaultHorizon = savedHorizon;
    } catch { /* Keep the in-memory defaults when browser storage is unavailable. */ }
    setHorizon(defaultHorizon);
    void load("IBM", defaultHorizon);
    setTime(new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()));
  }, [load]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = query.trim().toUpperCase();
    if (!/^[A-Z0-9.^_-]{1,15}$/.test(cleaned)) {
      setError("Enter a valid ticker symbol, like IBM or AAPL.");
      return;
    }
    void load(cleaned, horizon);
  }

  function selectHorizon(days: number) {
    setHorizon(days);
    void load(symbol, days);
  }

  function persistWatchlist(next: string[]) {
    setWatchlist(next);
    try { localStorage.setItem("signal.watchlist.v1", JSON.stringify(next)); } catch { /* Session still works without storage. */ }
  }

  function addTicker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ticker = tickerDraft.trim().toUpperCase();
    if (!/^[A-Z0-9.^_-]{1,15}$/.test(ticker)) { setTickerError("Enter a valid ticker, like IBM or BRK.B."); return; }
    if (watchlist.includes(ticker)) { setTickerError(`${ticker} is already in your watchlist.`); return; }
    persistWatchlist([...watchlist, ticker].slice(-12));
    setTickerError(""); setTickerDraft(""); setAddTickerOpen(false); setQuery(ticker); void load(ticker, horizon);
  }

  const expectedReturn = data?.forecast.length
    ? ((data.forecast[data.forecast.length - 1].price / data.lastPrice) - 1) * 100
    : 0;
  const lastForecast = data?.forecast[data.forecast.length - 1];
  const changeUp = (data?.change ?? 0) >= 0;

  return (
    <main className="app-frame">
      <aside className={mobileNav ? "sidebar open" : "sidebar"}>
        <div className="brand-lockup">
          <div className="brand-mark"><Activity size={20} strokeWidth={2.5} /></div>
          <div><strong>signal<span>.</span></strong><small>FORECAST LAB</small></div>
          <button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Close menu">×</button>
        </div>
        <div className="workspace-label">WORKSPACE <ChevronDown size={13} /></div>
        <div className="workspace-card">
          <div className="workspace-avatar">S</div>
          <div><strong>Personal lab</strong><small>Free workspace</small></div>
          <span className="workspace-chevron">•••</span>
        </div>
        <div className="nav-group-label">ANALYZE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><BarChart3 size={17} /><span>Forecast dashboard</span><span className="nav-live">LIVE</span></a>
          <a className="nav-item" href="#model"><Sparkles size={17} /><span>Model lab</span></a>
          <a className="nav-item" href="#watchlist"><TrendingUp size={17} /><span>Watchlist</span><span className="nav-count">{watchlist.length}</span></a>
        </nav>
          <div className="nav-group-label watch-label" id="watchlist">YOUR WATCHLIST <button className="tiny-plus" aria-label="Add ticker" onClick={() => { setTickerError(""); setAddTickerOpen(true); }}>+</button></div>
        <div className="watchlist">
          {watchlist.map((ticker, index) => (
            <button className={symbol === ticker ? "watch-row selected" : "watch-row"} key={ticker} onClick={() => { setQuery(ticker); void load(ticker, horizon); }}>
              <span className={`watch-icon watch-${index % 5}`}>{initials(ticker)}</span>
              <span className="watch-ticker">{ticker}<small>{COMPANY_NAMES[ticker] || "Stock ticker"}</small></span>
              <span className="watch-spark">{index % 2 ? "⌁" : "⌁"}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={16} /></div>
            <strong>New to the model?</strong>
            <p>See how a compact LSTM turns past returns into a forecast.</p>
            <a href="#model">Explore the model <ArrowRight size={13} /></a>
          </div>
          <button className="nav-item settings-link" onClick={() => setSettingsOpen(true)}><Settings2 size={17} /><span>Settings</span></button>
          <div className="user-row"><div className="user-avatar">TC</div><div><strong>Teja Charan</strong><small>Personal account</small></div><ChevronDown size={14} /></div>
        </div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Command size={18} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Forecast dashboard</strong></div>
          <div className="topbar-right">
            <div className="market-status"><span className="status-pulse" /> US MARKET <span className="status-separator">·</span> DAILY</div>
            <button className="top-icon" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={17} />{notifications.length > 0 && <i />}</button>
            <div className="top-avatar">TC</div>
          </div>
        </header>

        <div className="content" id="overview">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> MARKET INTELLIGENCE <span className="heading-dot">/</span> MODEL SANDBOX</div>
              <h1>Forecast <span>with context.</span></h1>
              <p className="page-subtitle">Explore what a small LSTM learns from recent price history.</p>
            </div>
            <div className="heading-actions">
              <button className="quiet-button"><Clock3 size={14} /> Updated {time || "just now"}</button>
              <button className="share-button" onClick={() => navigator.clipboard?.writeText(window.location.href)}><ArrowRight size={14} /> Share</button>
            </div>
          </div>

          <div className="search-row">
            <form className="ticker-search" onSubmit={submit}>
              <Search size={17} />
              <input aria-label="Search ticker" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticker…" maxLength={15} />
              <span className="search-hint">TICKER</span>
              <button type="submit" disabled={loading}>{loading ? <LoaderCircle size={16} className="spinner" /> : <ArrowRight size={17} />}</button>
            </form>
            <div className="quick-picks"><span>QUICK PICKS</span>{watchlist.filter((ticker) => ticker !== symbol).slice(0, 4).map((ticker) => <button key={ticker} onClick={() => { setQuery(ticker); void load(ticker, horizon); }}>{ticker}</button>)}</div>
          </div>

          {data?.mode === "demo" && (
            <div className="demo-banner"><Info size={15} /><span><strong>Simulation mode</strong> — the charts use generated sample prices, not real market data.</span><a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noreferrer">Add free data key <ArrowRight size={13} /></a></div>
          )}
          {error && (
            <div className="error-banner"><TriangleAlert size={16} /><span>{error}</span><button onClick={() => void load(symbol, horizon)}>Try again</button></div>
          )}

          <section className="instrument-header">
            <div className="instrument-title">
              <div className={`company-mark mark-${(data?.symbol || symbol).toLowerCase()}`}>{initials(data?.symbol || symbol)}</div>
              <div><div className="instrument-name">{data?.companyName || symbol} <span className="instrument-symbol">{data?.symbol || symbol}</span></div><div className="instrument-meta"><span className="exchange-pill">US · DAILY</span><span className="data-source"><Database size={12} /> {data?.source || "Market history"}</span></div></div>
            </div>
            <div className="price-summary">
              <strong>{data ? money(data.lastPrice, data.currency) : "—"}</strong>
              {data && <span className={changeUp ? "positive-change" : "negative-change"}>{changeUp ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{money(Math.abs(data.change), data.currency)} ({Math.abs(data.changePct).toFixed(2)}%) today</span>}
            </div>
          </section>

          {loading ? <Skeleton /> : data ? (
            <>
              <section className="metrics-grid" aria-label="Forecast summary">
                <article className="metric-card current-card"><div className="metric-label">LAST CLOSE <Info size={13} /></div><div className="metric-value">{money(data.lastPrice, data.currency)}</div><div className="metric-foot">as of {longDate(data.lastDate)}</div><div className="metric-icon"><BarChart3 size={17} /></div></article>
                <article className="metric-card forecast-card"><div className="metric-label">{horizon}-DAY MODEL ESTIMATE <Sparkles size={13} /></div><div className="metric-value">{lastForecast ? money(lastForecast.price, data.currency) : "—"}</div><div className={`metric-foot ${expectedReturn >= 0 ? "positive-change" : "negative-change"}`}>{expectedReturn >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(expectedReturn).toFixed(2)}% from last close <span className="metric-separator">·</span> {lastForecast ? shortDate(lastForecast.date) : ""}</div><div className="metric-icon lime-icon"><TrendingUp size={17} /></div></article>
                <article className="metric-card"><div className="metric-label">HOLDOUT MAE <Info size={13} /></div><div className="metric-value">{data.validationMaePct.toFixed(2)}<small>%</small></div><div className="metric-foot">average 1-day error on unseen history</div><div className="metric-icon"><Activity size={17} /></div></article>
                <article className="metric-card"><div className="metric-label">DAILY VOLATILITY <Info size={13} /></div><div className="metric-value">{data.volatilityPct.toFixed(2)}<small>%</small></div><div className="metric-foot">historical standard deviation</div><div className="metric-icon"><BarChart3 size={17} /></div></article>
              </section>

              <section className="panel chart-panel">
                <div className="panel-heading">
                  <div><div className="panel-title">Price history <span className="plus-title">+</span> model path</div><div className="panel-caption">Daily closing prices with a forward estimate</div></div>
                  <div className="forecast-select"><span>FORECAST</span>{[5, 10, 20].map((days) => <button className={horizon === days ? "horizon active" : "horizon"} key={days} onClick={() => selectHorizon(days)}>{days}D</button>)}</div>
                </div>
                {data.history.length > 2 && <Chart history={data.history} forecast={data.forecast} currency={data.currency} selected={period} onSelect={setPeriod} />}
              </section>

              <div className="lower-grid">
                <section className="panel forecast-panel">
                  <div className="panel-heading compact-heading"><div><div className="panel-title">Forecast path</div><div className="panel-caption">Next {horizon} trading sessions</div></div><span className="model-tag"><Sparkles size={12} /> LSTM</span></div>
                  <div
                    className="forecast-list"
                    role="region"
                    aria-label={`Forecast estimates for the next ${horizon} trading sessions`}
                    tabIndex={horizon > 5 ? 0 : undefined}
                  >
                    {data.forecast.map((point, index) => {
                      const fromLast = ((point.price / data.lastPrice) - 1) * 100;
                      return <div className="forecast-row" key={point.date}><div className="forecast-day"><span className="forecast-step">{String(index + 1).padStart(2, "0")}</span><span>{shortDate(point.date)}<small>{index === 0 ? "Next session" : `${index + 1} sessions ahead`}</small></span></div><div className="forecast-range"><span className="range-line"><i style={{ left: `${Math.max(0, Math.min(90, ((point.low - data.lastPrice) / (point.high - point.low || 1)) * 100))}%` }} /></span><small>{money(point.low, data.currency)} — {money(point.high, data.currency)}</small></div><strong className="forecast-price">{money(point.price, data.currency)}</strong><span className={fromLast >= 0 ? "forecast-delta up" : "forecast-delta down"}>{fromLast >= 0 ? "+" : ""}{fromLast.toFixed(2)}%</span></div>;
                    })}
                  </div>
                  <div className="panel-bottom-note"><Info size={13} /> The shaded range expands with historical forecast error. It is not a probability guarantee.</div>
                </section>

                <section className="panel model-panel" id="model">
                  <div className="panel-heading compact-heading"><div><div className="panel-title">Inside the model</div><div className="panel-caption">A small recurrent network, one step at a time</div></div><div className="model-symbol"><Activity size={16} /></div></div>
                  <div className="model-flow"><div className="flow-node"><span className="flow-index">01</span><span className="flow-icon"><Database size={15} /></span><strong>Daily closes</strong><small>~100 observations</small></div><div className="flow-arrow">→</div><div className="flow-node"><span className="flow-index">02</span><span className="flow-icon"><Activity size={15} /></span><strong>LSTM cell</strong><small>20-day return window</small></div><div className="flow-arrow">→</div><div className="flow-node"><span className="flow-index">03</span><span className="flow-icon"><TrendingUp size={15} /></span><strong>Next return</strong><small>iterated {horizon} sessions</small></div></div>
                  <div className="model-stats"><div><span>MODEL</span><strong>{data.model}</strong></div><div><span>VALIDATION</span><strong>Chronological holdout</strong></div><div><span>DATA UPDATED</span><strong>{longDate(data.lastDate)}</strong></div></div>
                  <div className="model-disclaimer"><ShieldCheck size={14} /><span>For learning and research only. This forecast is not investment advice and should not guide trades.</span></div>
                </section>
              </div>
            </>
          ) : (
            <section className="empty-state panel"><div className="empty-icon"><TriangleAlert size={22} /></div><h2>We couldn’t load this forecast</h2><p>{error || "Try another ticker or check your data-provider key."}</p><button className="retry-button" onClick={() => void load(symbol, horizon)}>Try again <ArrowRight size={14} /></button></section>
          )}

          <footer className="page-footer"><span>© 2026 SIGNAL LAB</span><span><ShieldCheck size={13} /> Educational use only · Data may be delayed · No investment advice</span><a href="https://www.alphavantage.co/documentation/" target="_blank" rel="noreferrer">Data documentation <ArrowRight size={12} /></a></footer>
        </div>
      </section>
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      {addTickerOpen && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddTickerOpen(false); }}><section className="app-dialog" role="dialog" aria-modal="true" aria-labelledby="add-ticker-title"><button className="dialog-close" aria-label="Close" onClick={() => setAddTickerOpen(false)}>×</button><span className="dialog-kicker">WATCHLIST</span><h2 id="add-ticker-title">Add a ticker</h2><p>Track another US-listed symbol in your personal watchlist.</p><form onSubmit={addTicker}><label htmlFor="ticker-draft">Ticker symbol</label><input id="ticker-draft" autoFocus value={tickerDraft} onChange={(event) => { setTickerDraft(event.target.value.toUpperCase()); setTickerError(""); }} placeholder="e.g. AMZN" maxLength={15} />{tickerError && <div className="dialog-error" role="alert">{tickerError}</div>}<div className="dialog-actions"><button type="button" className="dialog-secondary" onClick={() => setAddTickerOpen(false)}>Cancel</button><button type="submit" className="dialog-primary">Add and forecast <ArrowRight size={14} /></button></div></form></section></div>}
      {settingsOpen && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><section className="app-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><button className="dialog-close" aria-label="Close" onClick={() => setSettingsOpen(false)}>×</button><span className="dialog-kicker">PREFERENCES</span><h2 id="settings-title">Forecast settings</h2><p>Choose the default forecast length used when you open a ticker.</p><label htmlFor="default-horizon">Default forecast horizon</label><select id="default-horizon" value={horizon} onChange={(event) => { const value = Number(event.target.value); setHorizon(value); try { localStorage.setItem("signal.defaultHorizon.v1", String(value)); } catch { /* Preference remains active for this session. */ } void load(symbol, value); }}><option value={5}>5 trading sessions</option><option value={10}>10 trading sessions</option><option value={20}>20 trading sessions</option></select><div className="settings-note"><Database size={15} /><span>Data is fetched securely by the server. Provider updates and request limits can affect availability.</span></div><div className="dialog-actions"><button className="dialog-primary" onClick={() => setSettingsOpen(false)}>Done <Check size={14} /></button></div></section></div>}
      {notificationsOpen && <aside className="notification-panel" aria-label="Notifications"><div className="notification-heading"><div><span className="dialog-kicker">ACTIVITY</span><h2>Notifications</h2></div><button className="dialog-close" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}>×</button></div>{notifications.length ? <div className="notification-list">{notifications.map((item) => <article className="notification-item" key={item.id}><span className={item.error ? "notification-icon error" : "notification-icon"}>{item.error ? <TriangleAlert size={15} /> : <Check size={15} />}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}</div> : <div className="notifications-empty"><span><Bell size={17} /></span><strong>You’re all caught up</strong><p>Forecast completions and data errors will appear here. Price alerts aren’t configured.</p></div>}<div className="notification-foot">This activity is stored only for this session.</div></aside>}
    </main>
  );
}
