import { ImageResponse } from "next/og";

export const alt = "Signal Forecast Lab — interactive educational stock forecasting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      justifyContent: "space-between", padding: "58px 68px", color: "#f0f4ef",
      background: "radial-gradient(ellipse at 82% 13%, #26371e 0%, #0b100d 42%, #080b0a 78%)",
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        <div style={{ width: 42, height: 42, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "#c7ff56", color: "#13200c", fontSize: 23, fontWeight: 800 }}>S</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <strong style={{ fontSize: 22, letterSpacing: -1 }}>signal<span style={{ color: "#c7ff56" }}>.</span></strong>
          <span style={{ color: "#89958b", fontSize: 10, letterSpacing: 2 }}>FORECAST LAB</span>
        </div>
        <div style={{ marginLeft: "auto", border: "1px solid #415037", borderRadius: 20, padding: "9px 14px", color: "#bde786", fontSize: 12, letterSpacing: 1 }}>EDUCATIONAL MODEL</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 45 }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 610 }}>
          <span style={{ color: "#b5d889", fontSize: 13, letterSpacing: 2 }}>MARKET HISTORY · MACHINE LEARNING</span>
          <h1 style={{ margin: "22px 0 13px", fontSize: 60, lineHeight: 1.02, letterSpacing: -3 }}>Forecast<br />with context.</h1>
          <p style={{ margin: 0, color: "#a4afa6", fontSize: 20, lineHeight: 1.45 }}>Explore price history and an LSTM model, one forecast step at a time.</p>
        </div>
        <div style={{ width: 390, height: 250, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 23, border: "1px solid #29352d", borderRadius: 18, background: "#101713" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#91a095", fontSize: 13 }}><span>PRICE HISTORY + MODEL PATH</span><span style={{ color: "#c7ff56" }}>5D · 10D · 20D</span></div>
          <svg width="340" height="130" viewBox="0 0 340 130">
            <path d="M0 105H340M0 65H340M0 25H340" stroke="#26312a" strokeDasharray="4 7" />
            <path d="M2 94L34 87L62 98L93 67L122 77L153 50L183 59L214 35L244 52L272 25" fill="none" stroke="#c7ff56" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M272 25L307 40L338 16" fill="none" stroke="#9ed28a" strokeWidth="4" strokeDasharray="8 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", gap: 8 }}><span style={{ borderRadius: 5, padding: "7px 9px", background: "#202b1c", color: "#c7ff56", fontSize: 11 }}>HISTORICAL DATA</span><span style={{ borderRadius: 5, padding: "7px 9px", background: "#17211a", color: "#a1d29a", fontSize: 11 }}>LSTM ESTIMATE</span></div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#78857c", fontSize: 12, letterSpacing: 1 }}><span>LEARN THE MODEL · EXPLORE THE DATA</span><span>NOT INVESTMENT ADVICE</span></div>
    </div>,
    { ...size },
  );
}
