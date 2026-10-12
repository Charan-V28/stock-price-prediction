import type { ForecastPoint, ForecastResponse, Point } from "./types";

const HELP_URL = "https://www.alphavantage.co/support/#api-key";
const SEQUENCE_LENGTH = 20;
const HIDDEN_SIZE = 8;
const COMPANIES: Record<string, string> = {
  IBM: "International Business Machines",
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corporation",
  NVDA: "NVIDIA Corporation",
  TSLA: "Tesla, Inc.",
  SPY: "SPDR S&P 500 ETF",
  AMZN: "Amazon.com, Inc.",
  GOOGL: "Alphabet Inc.",
  META: "Meta Platforms, Inc.",
  AMD: "Advanced Micro Devices",
};
const PRICE_ANCHORS: Record<string, number> = {
  IBM: 260, AAPL: 220, MSFT: 510, NVDA: 175, TSLA: 330,
  SPY: 650, AMZN: 230, GOOGL: 190, META: 740, AMD: 165,
};

type Params = { w: number[][]; b: number[]; wy: number[]; by: number };
type CellState = {
  joined: Float64Array;
  i: Float64Array;
  f: Float64Array;
  g: Float64Array;
  o: Float64Array;
  previousCell: Float64Array;
  tanhCell: Float64Array;
};

function sigmoid(value: number): number {
  const clipped = Math.max(-30, Math.min(30, value));
  return 1 / (1 + Math.exp(-clipped));
}

function forward(sequences: number[][], params: Params, keepStates = false) {
  const batch = sequences.length;
  let hidden = Array.from({ length: batch }, () => new Float64Array(HIDDEN_SIZE));
  let cell = Array.from({ length: batch }, () => new Float64Array(HIDDEN_SIZE));
  const states: CellState[][] = [];

  for (let step = 0; step < sequences[0].length; step += 1) {
    const nextHidden = Array.from({ length: batch }, () => new Float64Array(HIDDEN_SIZE));
    const nextCell = Array.from({ length: batch }, () => new Float64Array(HIDDEN_SIZE));
    const timeStates: CellState[] = [];
    for (let sample = 0; sample < batch; sample += 1) {
      const joined = new Float64Array(HIDDEN_SIZE + 1);
      joined[0] = sequences[sample][step];
      joined.set(hidden[sample], 1);
      const gates = new Float64Array(4 * HIDDEN_SIZE);
      for (let gate = 0; gate < gates.length; gate += 1) {
        let value = params.b[gate];
        for (let column = 0; column < joined.length; column += 1) value += params.w[gate][column] * joined[column];
        gates[gate] = value;
      }
      const i = new Float64Array(HIDDEN_SIZE);
      const f = new Float64Array(HIDDEN_SIZE);
      const g = new Float64Array(HIDDEN_SIZE);
      const o = new Float64Array(HIDDEN_SIZE);
      const tanhCell = new Float64Array(HIDDEN_SIZE);
      const previousCell = cell[sample];
      for (let unit = 0; unit < HIDDEN_SIZE; unit += 1) {
        i[unit] = sigmoid(gates[unit]);
        f[unit] = sigmoid(gates[HIDDEN_SIZE + unit]);
        g[unit] = Math.tanh(gates[2 * HIDDEN_SIZE + unit]);
        o[unit] = sigmoid(gates[3 * HIDDEN_SIZE + unit]);
        nextCell[sample][unit] = f[unit] * previousCell[unit] + i[unit] * g[unit];
        tanhCell[unit] = Math.tanh(nextCell[sample][unit]);
        nextHidden[sample][unit] = o[unit] * tanhCell[unit];
      }
      if (keepStates) timeStates.push({ joined, i, f, g, o, previousCell, tanhCell });
    }
    if (keepStates) states.push(timeStates);
    hidden = nextHidden;
    cell = nextCell;
  }
  const predictions = hidden.map((row) => row.reduce((sum, value, index) => sum + value * params.wy[index], params.by));
  return { predictions, states, finalHidden: hidden };
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function lstmPredict(returns: number[]) {
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const scale = Math.max(Math.sqrt(returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length), 0.001);
  const normalized = returns.map((value) => Math.max(-5, Math.min(5, (value - mean) / scale)));
  const sequences = normalized.slice(0, normalized.length - SEQUENCE_LENGTH)
    .map((_, index) => normalized.slice(index, index + SEQUENCE_LENGTH));
  const targets = normalized.slice(SEQUENCE_LENGTH);
  if (sequences.length < 24) throw new Error("At least 45 daily prices are required for this forecast.");

  const split = Math.min(Math.max(Math.floor(sequences.length * 0.8), 12), sequences.length - 4);
  const trainX = sequences.slice(0, split);
  const trainY = targets.slice(0, split);
  const valX = sequences.slice(split);
  const valY = targets.slice(split);
  const random = seededRandom(12);
  const params: Params = {
    w: Array.from({ length: 4 * HIDDEN_SIZE }, () => Array.from({ length: HIDDEN_SIZE + 1 }, () => (random() * 2 - 1) * 0.12)),
    b: Array(4 * HIDDEN_SIZE).fill(0),
    wy: Array.from({ length: HIDDEN_SIZE }, () => (random() * 2 - 1) * 0.12),
    by: 0,
  };
  for (let unit = 0; unit < HIDDEN_SIZE; unit += 1) params.b[HIDDEN_SIZE + unit] = 1;

  const firstW = params.w.map((row) => row.map(() => 0));
  const secondW = params.w.map((row) => row.map(() => 0));
  const firstB = params.b.map(() => 0);
  const secondB = params.b.map(() => 0);
  const firstWy = params.wy.map(() => 0);
  const secondWy = params.wy.map(() => 0);
  let firstBy = 0;
  let secondBy = 0;
  const beta1 = 0.9;
  const beta2 = 0.999;
  const epsilon = 1e-8;
  const learningRate = 0.008;

  for (let epoch = 0; epoch < 35; epoch += 1) {
    const { predictions, states, finalHidden } = forward(trainX, params, true);
    const dPrediction = predictions.map((prediction, index) => (2 / trainX.length) * (prediction - trainY[index]));
    const gradW = params.w.map((row) => row.map(() => 0));
    const gradB = params.b.map(() => 0);
    const gradWy = params.wy.map(() => 0);
    let gradBy = 0;
    let dh = Array.from({ length: trainX.length }, (_, sample) => {
      const row = new Float64Array(HIDDEN_SIZE);
      for (let unit = 0; unit < HIDDEN_SIZE; unit += 1) {
        gradWy[unit] += finalHidden[sample][unit] * dPrediction[sample];
        row[unit] = dPrediction[sample] * params.wy[unit];
      }
      gradBy += dPrediction[sample];
      return row;
    });
    let dc = Array.from({ length: trainX.length }, () => new Float64Array(HIDDEN_SIZE));

    for (let step = states.length - 1; step >= 0; step -= 1) {
      const dhPrevious = Array.from({ length: trainX.length }, () => new Float64Array(HIDDEN_SIZE));
      const dcPrevious = Array.from({ length: trainX.length }, () => new Float64Array(HIDDEN_SIZE));
      for (let sample = 0; sample < trainX.length; sample += 1) {
        const state = states[step][sample];
        const dz = new Float64Array(4 * HIDDEN_SIZE);
        for (let unit = 0; unit < HIDDEN_SIZE; unit += 1) {
          const doGate = dh[sample][unit] * state.tanhCell[unit];
          const dcTotal = dh[sample][unit] * state.o[unit] * (1 - state.tanhCell[unit] ** 2) + dc[sample][unit];
          const di = dcTotal * state.g[unit];
          const df = dcTotal * state.previousCell[unit];
          const dg = dcTotal * state.i[unit];
          dcPrevious[sample][unit] = dcTotal * state.f[unit];
          dz[unit] = di * state.i[unit] * (1 - state.i[unit]);
          dz[HIDDEN_SIZE + unit] = df * state.f[unit] * (1 - state.f[unit]);
          dz[2 * HIDDEN_SIZE + unit] = dg * (1 - state.g[unit] ** 2);
          dz[3 * HIDDEN_SIZE + unit] = doGate * state.o[unit] * (1 - state.o[unit]);
        }
        for (let gate = 0; gate < dz.length; gate += 1) {
          gradB[gate] += dz[gate];
          for (let column = 0; column < state.joined.length; column += 1) gradW[gate][column] += dz[gate] * state.joined[column];
          for (let unit = 0; unit < HIDDEN_SIZE; unit += 1) dhPrevious[sample][unit] += params.w[gate][unit + 1] * dz[gate];
        }
      }
      dh = dhPrevious;
      dc = dcPrevious;
    }

    let squaredNorm = gradBy ** 2 + gradWy.reduce((sum, value) => sum + value ** 2, 0)
      + gradB.reduce((sum, value) => sum + value ** 2, 0)
      + gradW.reduce((sum, row) => sum + row.reduce((rowSum, value) => rowSum + value ** 2, 0), 0);
    const norm = Math.sqrt(squaredNorm);
    const clip = norm > 1 ? 1 / norm : 1;
    const step = epoch + 1;
    const update = (value: number, gradient: number, first: number, second: number) => {
      const g = gradient * clip;
      const m = beta1 * first + (1 - beta1) * g;
      const v = beta2 * second + (1 - beta2) * g * g;
      const mHat = m / (1 - beta1 ** step);
      const vHat = v / (1 - beta2 ** step);
      return { value: value - learningRate * mHat / (Math.sqrt(vHat) + epsilon), first: m, second: v };
    };
    for (let gate = 0; gate < params.w.length; gate += 1) {
      let updated = update(params.b[gate], gradB[gate], firstB[gate], secondB[gate]);
      params.b[gate] = updated.value; firstB[gate] = updated.first; secondB[gate] = updated.second;
      for (let column = 0; column < params.w[gate].length; column += 1) {
        updated = update(params.w[gate][column], gradW[gate][column], firstW[gate][column], secondW[gate][column]);
        params.w[gate][column] = updated.value; firstW[gate][column] = updated.first; secondW[gate][column] = updated.second;
      }
    }
    for (let unit = 0; unit < HIDDEN_SIZE; unit += 1) {
      const updated = update(params.wy[unit], gradWy[unit], firstWy[unit], secondWy[unit]);
      params.wy[unit] = updated.value; firstWy[unit] = updated.first; secondWy[unit] = updated.second;
    }
    const updatedBy = update(params.by, gradBy, firstBy, secondBy);
    params.by = updatedBy.value; firstBy = updatedBy.first; secondBy = updatedBy.second;
    squaredNorm = 0;
  }

  const validation = forward(valX, params).predictions;
  const validationReturns = valY.map((value) => mean + value * scale);
  const predictedReturns = validation.map((value) => mean + value * scale);
  const maePct = predictedReturns.reduce((sum, value, index) => {
    const actual = Math.expm1(Math.max(-0.2, Math.min(0.2, validationReturns[index])));
    const predicted = Math.expm1(Math.max(-0.2, Math.min(0.2, value)));
    return sum + Math.abs(predicted - actual);
  }, 0) / predictedReturns.length * 100;
  const residuals = valY.map((value, index) => (value - validation[index]) * scale);
  const residualMean = residuals.reduce((sum, value) => sum + value, 0) / residuals.length;
  const residualSigma = Math.sqrt(residuals.reduce((sum, value) => sum + (value - residualMean) ** 2, 0) / residuals.length);
  const returnVolatility = Math.sqrt(returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length);
  const bandSigma = Math.max(residualSigma, returnVolatility * 0.45, 0.002);
  let context = normalized.slice(-SEQUENCE_LENGTH);
  const predictions: number[] = [];
  for (let day = 0; day < 20; day += 1) {
    const normalizedReturn = forward([context], params).predictions[0];
    predictions.push(Math.max(-0.12, Math.min(0.12, mean + normalizedReturn * scale)));
    context = [...context.slice(1), Math.max(-5, Math.min(5, normalizedReturn))];
  }
  return { predictions, maePct, bandSigma, returnVolatility };
}

function mockHistory(symbol: string): Point[] {
  let seed = 2166136261;
  for (const character of symbol) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  const random = seededRandom(seed);
  const gaussian = () => {
    const first = Math.max(random(), 1e-9);
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * random());
  };
  let price = PRICE_ANCHORS[symbol] ?? 85 + (seed % 700);
  const days: string[] = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  while (days.length < 140) {
    if (cursor.getUTCDay() !== 0 && cursor.getUTCDay() !== 6) days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return days.reverse().map((day, index) => {
    const cycle = 0.00025 * Math.sin(index / 8.5) + 0.00015 * Math.cos(index / 17);
    price *= Math.exp(cycle + 0.0002 + gaussian() * 0.014);
    return { date: day, close: Number(price.toFixed(4)) };
  });
}

async function marketHistory(symbol: string): Promise<{ history: Point[]; source: string; mode: "live" | "demo" }> {
  const key = process.env.ALPHA_VANTAGE_API_KEY?.trim();
  if (!key) return { history: mockHistory(symbol), source: "Simulated demo prices", mode: "demo" };
  const query = new URLSearchParams({ function: "TIME_SERIES_DAILY", symbol, outputsize: "compact", apikey: key });
  const response = await fetch(`https://www.alphavantage.co/query?${query}`, {
    headers: { Accept: "application/json", "User-Agent": "SignalForecastLab/1.0" },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Market data provider returned HTTP ${response.status}. Please retry shortly.`);
  const payload = await response.json() as Record<string, unknown>;
  const seriesKey = Object.keys(payload).find((name) => name.startsWith("Time Series"));
  if (!seriesKey || !payload[seriesKey] || typeof payload[seriesKey] !== "object") {
    const detail = payload.Note ?? payload.Information ?? payload["Error Message"];
    if (typeof detail === "string" && /rate limit|call frequency|requests per (second|minute|day)|premium plans|thank you for using alpha vantage/i.test(detail)) {
      throw new Error("Alpha Vantage rate-limited this request. Wait a few seconds before trying again; the free plan also has a daily request limit.");
    }
    if (typeof payload["Error Message"] === "string") {
      throw new Error("Alpha Vantage couldn’t find daily price history for this ticker. Check the symbol and try again.");
    }
    throw new Error("No daily prices were returned. Please try again later or check the ticker symbol.");
  }
  const history = Object.entries(payload[seriesKey] as Record<string, Record<string, string>>)
    .map(([date, row]) => ({ date, close: Number(row["4. close"]) }))
    .filter((point) => Number.isFinite(point.close) && point.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-100);
  if (history.length < 45) throw new Error("The provider returned too little history to train a stable educational model.");
  return { history, source: "Alpha Vantage · daily close", mode: "live" };
}

function nextTradingDay(value: string): string {
  const day = new Date(`${value}T12:00:00Z`);
  do day.setUTCDate(day.getUTCDate() + 1); while (day.getUTCDay() === 0 || day.getUTCDay() === 6);
  return day.toISOString().slice(0, 10);
}

export async function createForecast(symbol: string, horizon: number): Promise<ForecastResponse> {
  const market = await marketHistory(symbol);
  const closes = market.history.map((point) => point.close);
  const returns = closes.slice(1).map((close, index) => Math.log(close / closes[index]));
  const model = lstmPredict(returns);
  let currentPrice = closes[closes.length - 1];
  let currentDate = market.history[market.history.length - 1].date;
  const forecast: ForecastPoint[] = model.predictions.slice(0, horizon).map((logReturn, index) => {
    currentDate = nextTradingDay(currentDate);
    currentPrice *= Math.exp(logReturn);
    const uncertainty = 1.28 * model.bandSigma * Math.sqrt(index + 1);
    return {
      date: currentDate,
      price: Number(currentPrice.toFixed(4)),
      low: Number((currentPrice * Math.exp(-uncertainty)).toFixed(4)),
      high: Number((currentPrice * Math.exp(uncertainty)).toFixed(4)),
    };
  });
  const previous = closes[closes.length - 2];
  const lastPrice = closes[closes.length - 1];
  const change = lastPrice - previous;
  return {
    symbol,
    companyName: COMPANIES[symbol] ?? symbol,
    currency: "USD",
    lastPrice,
    lastDate: market.history[market.history.length - 1].date,
    change,
    changePct: change / previous * 100,
    history: market.history,
    forecast,
    validationMaePct: Number(model.maePct.toFixed(3)),
    volatilityPct: Number((model.returnVolatility * 100).toFixed(3)),
    model: "LSTM · TypeScript",
    source: market.source,
    mode: market.mode,
    updatedAt: new Date().toISOString(),
  };
}

export { HELP_URL };
