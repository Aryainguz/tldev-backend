import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TL;Dev — One-Shot Tech Learning for Serious Engineers",
  description:
    "Learn from daily tech shots trained on the best articles, research papers, and real system design knowledge — no fluff.",
  keywords: [
    "developer",
    "engineering",
    "learning",
    "system design",
    "backend",
    "tech tips",
  ],
  authors: [{ name: "TL;Dev" }],
  openGraph: {
    title: "TL;Dev — Be ∞× Dev",
    description: "One-Shot Tech Learning for Serious Engineers",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TL;Dev — Be ∞× Dev",
    description: "One-Shot Tech Learning for Serious Engineers",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
