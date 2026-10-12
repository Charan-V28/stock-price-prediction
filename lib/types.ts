export type Point = {
  date: string;
  close: number;
};

export type ForecastPoint = {
  date: string;
  price: number;
  low: number;
  high: number;
};

export type ForecastResponse = {
  symbol: string;
  companyName: string;
  currency: string;
  lastPrice: number;
  lastDate: string;
  change: number;
  changePct: number;
  history: Point[];
  forecast: ForecastPoint[];
  validationMaePct: number;
  volatilityPct: number;
  model: string;
  source: string;
  mode: "live" | "demo";
  updatedAt: string;
};

export type ApiError = {
  error: string;
  helpUrl?: string;
};
