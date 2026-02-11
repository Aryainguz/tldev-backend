import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "TL;Dev — One-Shot Tech Learning for Serious Engineers";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Brand colors from logo
const CYAN_START = "#7FEFEF";
const CYAN_END = "#5BC4C4";
const PINK_START = "#E8A5D8";
const PINK_END = "#D68FD6";
const BG_COLOR = "#0f0f0f";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: BG_COLOR,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Subtle glow effect - cyan on left */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "25%",
          transform: "translate(-50%, -50%)",
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(127, 239, 239, 0.12) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />

      {/* Subtle glow effect - pink on right */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          right: "15%",
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(232, 165, 216, 0.12) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />

      {/* Main Logo - TL;Dev */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        {/* TL; in cyan gradient */}
        <span
          style={{
            fontSize: "140px",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            background: `linear-gradient(180deg, ${CYAN_START} 0%, ${CYAN_END} 100%)`,
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          TL;
        </span>
        {/* Dev in pink gradient */}
        <span
          style={{
            fontSize: "140px",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            background: `linear-gradient(180deg, ${PINK_START} 0%, ${PINK_END} 100%)`,
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Dev
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: "32px",
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.8)",
          letterSpacing: "-0.01em",
          marginBottom: "48px",
        }}
      >
        Learn Engineering in Shorts.
      </div>

      {/* Tech badges */}
      <div
        style={{
          display: "flex",
          gap: "16px",
        }}
      >
        {["System Design", "Backend", "Performance", "APIs"].map(
          (tag, index) => (
            <div
              key={tag}
              style={{
                padding: "12px 24px",
                background:
                  index < 2
                    ? "rgba(127, 239, 239, 0.1)"
                    : "rgba(232, 165, 216, 0.1)",
                border:
                  index < 2
                    ? "1px solid rgba(127, 239, 239, 0.3)"
                    : "1px solid rgba(232, 165, 216, 0.3)",
                borderRadius: "100px",
                fontSize: "18px",
                fontWeight: 500,
                color: index < 2 ? CYAN_START : PINK_START,
              }}
            >
              {tag}
            </div>
          ),
        )}
      </div>

      {/* Bottom gradient line */}
      <div
        style={{
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0",
          height: "4px",
          background: `linear-gradient(90deg, transparent 0%, ${CYAN_START} 30%, ${PINK_START} 70%, transparent 100%)`,
        }}
      />
    </div>,
    {
      ...size,
    },
  );
}
