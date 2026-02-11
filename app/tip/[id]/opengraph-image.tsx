import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export const alt = "TL;Dev Tip";
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

const CYAN = "#7FEFEF";
const CYAN_DIM = "#5BC4C4";
const PINK = "#E8A5D8";
const BG = "#0f0f0f";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let tip: {
        tipText: string;
        tipSummary: string | null;
        category: string;
        codeSnippet: string | null;
    } | null = null;

    try {
        tip = await prisma.tip.findUnique({
            where: { id, status: "published" },
            select: {
                tipText: true,
                tipSummary: true,
                category: true,
                codeSnippet: true,
            },
        });
    } catch {
        // fallback to generic image
    }

    if (!tip) {
        // Fallback: generic TL;Dev image
        return new ImageResponse(
            <div
                style={{
                    background: BG,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "system-ui, sans-serif",
                }}
            >
                <div style={{ display: "flex", alignItems: "center" }}>
                    <span
                        style={{
                            fontSize: "120px",
                            fontWeight: 800,
                            color: CYAN,
                        }}
                    >
                        TL;
                    </span>
                    <span
                        style={{
                            fontSize: "120px",
                            fontWeight: 800,
                            color: PINK,
                        }}
                    >
                        Dev
                    </span>
                </div>
            </div>,
            { ...size }
        );
    }

    const titleText =
        tip.tipText.length > 80 ? tip.tipText.substring(0, 77) + "..." : tip.tipText;

    const codePreview = tip.codeSnippet
        ? tip.codeSnippet.substring(0, 120) + (tip.codeSnippet.length > 120 ? "..." : "")
        : null;

    return new ImageResponse(
        <div
            style={{
                background: BG,
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                fontFamily: "system-ui, sans-serif",
                padding: "60px 70px",
            }}
        >
            {/* Background glow - cyan */}
            <div
                style={{
                    position: "absolute",
                    top: "-100px",
                    left: "-50px",
                    width: "500px",
                    height: "500px",
                    background:
                        "radial-gradient(circle, rgba(127,239,239,0.1) 0%, transparent 70%)",
                    borderRadius: "50%",
                }}
            />
            {/* Background glow - pink */}
            <div
                style={{
                    position: "absolute",
                    bottom: "-100px",
                    right: "-50px",
                    width: "400px",
                    height: "400px",
                    background:
                        "radial-gradient(circle, rgba(232,165,216,0.08) 0%, transparent 70%)",
                    borderRadius: "50%",
                }}
            />

            {/* Top row: Logo + Category */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "40px",
                }}
            >
                {/* Logo */}
                <div style={{ display: "flex", alignItems: "center" }}>
                    <span
                        style={{
                            fontSize: "36px",
                            fontWeight: 800,
                            color: CYAN,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        TL;
                    </span>
                    <span
                        style={{
                            fontSize: "36px",
                            fontWeight: 800,
                            color: PINK,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Dev
                    </span>
                </div>

                {/* Category badge */}
                <div
                    style={{
                        padding: "8px 24px",
                        background: "rgba(127,239,239,0.12)",
                        border: "1px solid rgba(127,239,239,0.25)",
                        borderRadius: "100px",
                        fontSize: "18px",
                        fontWeight: 600,
                        color: CYAN,
                    }}
                >
                    {tip.category}
                </div>
            </div>

            {/* Tip title */}
            <div
                style={{
                    fontSize: "48px",
                    fontWeight: 700,
                    color: "#ffffff",
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                    marginBottom: "24px",
                    flex: 1,
                    display: "flex",
                    alignItems: "flex-start",
                }}
            >
                {titleText}
            </div>

            {/* Code preview (if available) */}
            {codePreview && (
                <div
                    style={{
                        display: "flex",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "16px",
                        padding: "20px 24px",
                        marginBottom: "24px",
                    }}
                >
                    <pre
                        style={{
                            fontSize: "16px",
                            color: "rgba(255,255,255,0.6)",
                            fontFamily: "monospace",
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.4,
                        }}
                    >
                        {codePreview}
                    </pre>
                </div>
            )}

            {/* Bottom gradient line */}
            <div
                style={{
                    position: "absolute",
                    bottom: "0",
                    left: "0",
                    right: "0",
                    height: "4px",
                    background: `linear-gradient(90deg, transparent 0%, ${CYAN} 30%, ${PINK} 70%, transparent 100%)`,
                }}
            />
        </div>,
        { ...size }
    );
}
