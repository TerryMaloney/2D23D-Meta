import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt =
  "StatementClear — convert bank statements in your browser, verified to the cent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f8f7",
          padding: 72,
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 64, fontWeight: 700, color: "#1c2826" }}>
            StatementClear
          </div>
          <div style={{ fontSize: 32, color: "#51605c", marginTop: 16, maxWidth: 900 }}>
            Bank statement PDFs → CSV · Excel · QBO · Xero. In your browser —
            files never upload.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#0e6b48",
            color: "#ffffff",
            borderRadius: 4,
            padding: "28px 36px",
            fontSize: 30,
          }}
        >
          <span>Opening $4,210.55 + 38 transactions = Closing $4,421.25</span>
          <span style={{ fontWeight: 700 }}>verified to the cent</span>
        </div>
      </div>
    ),
    size,
  );
}
