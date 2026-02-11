import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";

const siteUrl = "https://tldev.thexitingway.com";

interface PageProps {
    params: Promise<{ id: string }>;
}

async function getTip(id: string) {
    const tip = await prisma.tip.findUnique({
        where: { id, status: "published" },
        select: {
            id: true,
            tipText: true,
            tipSummary: true,
            tipDetail: true,
            codeSnippet: true,
            category: true,
            tags: true,
            image: true,
            createdAt: true,
        },
    });
    return tip;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { id } = await params;
    const tip = await getTip(id);

    if (!tip) {
        return {
            title: "Tip Not Found | TL;Dev",
            description: "This tip could not be found.",
        };
    }

    const image = tip.image as { url: string } | null;
    const title = `${tip.tipText} | TL;Dev`;
    const description =
        tip.tipSummary || tip.tipText.substring(0, 160);

    return {
        title,
        description,
        openGraph: {
            type: "article",
            title: tip.tipText,
            description,
            siteName: "TL;Dev",
            url: `${siteUrl}/tip/${tip.id}`,
        },
        twitter: {
            card: "summary_large_image",
            title: tip.tipText,
            description,
        },
    };
}

export default async function TipSharePage({ params }: PageProps) {
    const { id } = await params;
    const tip = await getTip(id);

    if (!tip) {
        notFound();
    }

    const image = tip.image as { url: string } | null;
    const deepLink = `tldev://tip/${tip.id}`;

    const CYAN = "#7FEFEF";
    const PINK = "#E8A5D8";
    const BG = "#0f0f0f";

    return (
        <div
            style={{
                minHeight: "100vh",
                background: BG,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Background glows */}
            <div
                style={{
                    position: "absolute",
                    top: "20%",
                    left: "30%",
                    width: "400px",
                    height: "400px",
                    background:
                        "radial-gradient(circle, rgba(127,239,239,0.08) 0%, transparent 70%)",
                    pointerEvents: "none",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "20%",
                    right: "20%",
                    width: "300px",
                    height: "300px",
                    background:
                        "radial-gradient(circle, rgba(232,165,216,0.06) 0%, transparent 70%)",
                    pointerEvents: "none",
                }}
            />

            {/* Logo */}
            <div style={{ marginBottom: "32px", zIndex: 1 }}>
                <span style={{ fontSize: "24px", fontWeight: 700 }}>
                    <span
                        style={{
                            background: `linear-gradient(180deg, ${CYAN} 0%, #5BC4C4 100%)`,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        TL;
                    </span>
                    <span
                        style={{
                            background: `linear-gradient(180deg, ${PINK} 0%, #D68FD6 100%)`,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        Dev
                    </span>
                </span>
            </div>

            {/* Tip Card */}
            <div
                style={{
                    maxWidth: "520px",
                    width: "100%",
                    background: "linear-gradient(145deg, #1a1a1d 0%, #111113 100%)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "24px",
                    overflow: "hidden",
                    zIndex: 1,
                    boxShadow:
                        "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(127,239,239,0.05)",
                }}
            >
                {/* Image */}
                {image?.url && (
                    <div
                        style={{
                            width: "100%",
                            height: "240px",
                            overflow: "hidden",
                            position: "relative",
                        }}
                    >
                        <img
                            src={image.url}
                            alt={tip.tipText}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: "80px",
                                background:
                                    "linear-gradient(transparent, #1a1a1d)",
                            }}
                        />
                    </div>
                )}

                {/* Content */}
                <div style={{ padding: "24px 28px 28px" }}>
                    {/* Category badge */}
                    <span
                        style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            background: "rgba(127,239,239,0.1)",
                            color: CYAN,
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 600,
                            marginBottom: "16px",
                            letterSpacing: "0.5px",
                        }}
                    >
                        {tip.category}
                    </span>

                    {/* Title */}
                    <h1
                        style={{
                            fontSize: "22px",
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.3,
                            marginBottom: "12px",
                            color: "#fff",
                        }}
                    >
                        {tip.tipText}
                    </h1>

                    {/* Summary */}
                    {tip.tipSummary && (
                        <p
                            style={{
                                fontSize: "15px",
                                color: "rgba(255,255,255,0.55)",
                                lineHeight: 1.6,
                                marginBottom: "20px",
                            }}
                        >
                            {tip.tipSummary}
                        </p>
                    )}

                    {/* Code snippet preview */}
                    {tip.codeSnippet && (
                        <div
                            style={{
                                background: "rgba(0,0,0,0.4)",
                                borderRadius: "12px",
                                padding: "14px 16px",
                                marginBottom: "20px",
                                border: "1px solid rgba(255,255,255,0.05)",
                            }}
                        >
                            <pre
                                style={{
                                    fontFamily: "'Menlo', 'Monaco', monospace",
                                    fontSize: "12px",
                                    color: "rgba(255,255,255,0.7)",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    margin: 0,
                                    maxHeight: "120px",
                                    overflow: "hidden",
                                }}
                            >
                                {tip.codeSnippet.substring(0, 200)}
                                {tip.codeSnippet.length > 200 ? "..." : ""}
                            </pre>
                        </div>
                    )}

                    {/* Divider */}
                    <div
                        style={{
                            height: "1px",
                            background: "rgba(255,255,255,0.06)",
                            marginBottom: "20px",
                        }}
                    />

                    {/* Open in App button */}
                    <a
                        href={deepLink}
                        style={{
                            display: "block",
                            textAlign: "center",
                            padding: "14px 32px",
                            background: "linear-gradient(135deg, #7FEFEF 0%, #5BC4C4 100%)",
                            color: "#000",
                            borderRadius: "999px",
                            fontWeight: 700,
                            fontSize: "15px",
                            textDecoration: "none",
                            letterSpacing: "-0.01em",
                            marginBottom: "12px",
                        }}
                    >
                        Open in TL;Dev App
                    </a>

                    {/* Download fallback */}
                    <a
                        href={siteUrl}
                        style={{
                            display: "block",
                            textAlign: "center",
                            padding: "12px 32px",
                            background: "transparent",
                            color: "rgba(255,255,255,0.5)",
                            borderRadius: "999px",
                            fontWeight: 500,
                            fontSize: "13px",
                            textDecoration: "none",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        Don&apos;t have the app? Download it
                    </a>
                </div>
            </div>

            {/* Footer */}
            <p
                style={{
                    marginTop: "32px",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.3)",
                    zIndex: 1,
                }}
            >
                Learn Engineering in One Shot
            </p>
        </div>
    );
}
