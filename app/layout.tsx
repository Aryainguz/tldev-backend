import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tldev.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f0f0f" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TL;Dev — One-Shot Tech Learning for Serious Engineers",
    template: "%s | TL;Dev",
  },
  description:
    "Level up your engineering skills with daily tech shots. Learn system design, backend architecture, performance optimization, and more — trained on the best articles, research papers, and real-world knowledge. No fluff, just pure engineering wisdom.",
  keywords: [
    "developer learning",
    "software engineering",
    "system design",
    "backend development",
    "tech tips",
    "programming",
    "engineering education",
    "distributed systems",
    "API design",
    "database optimization",
    "performance tuning",
    "microservices",
    "cloud architecture",
    "developer productivity",
    "coding tips",
    "software architecture",
  ],
  authors: [{ name: "TL;Dev Team", url: siteUrl }],
  creator: "TL;Dev",
  publisher: "TL;Dev",
  applicationName: "TL;Dev",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  category: "Technology",
  classification: "Developer Education",

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "TL;Dev",
    title: "TL;Dev — Be ∞× Dev",
    description:
      "One-Shot Tech Learning for Serious Engineers. Daily tech shots on system design, backend, performance & more.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "TL;Dev — One-Shot Tech Learning for Serious Engineers",
        type: "image/png",
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    site: "@tldevapp",
    creator: "@tldevapp",
    title: "TL;Dev — Be ∞× Dev",
    description:
      "One-Shot Tech Learning for Serious Engineers. Daily tech shots on system design, backend, performance & more.",
    images: ["/twitter-image"],
  },

  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },

  // Manifest for PWA
  manifest: "/manifest.json",

  // Robots
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Alternate languages (for future i18n)
  alternates: {
    canonical: siteUrl,
    languages: {
      "en-US": siteUrl,
    },
  },

  // Verification (add your actual verification codes)
  // verification: {
  //   google: "your-google-verification-code",
  //   yandex: "your-yandex-verification-code",
  // },

  // Other
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "TL;Dev",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#09090b",
    "msapplication-config": "/browserconfig.xml",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "TL;Dev",
        description: "One-Shot Tech Learning for Serious Engineers",
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "TL;Dev",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/icon-512.png`,
          width: 512,
          height: 512,
        },
        sameAs: ["https://twitter.com/tldevapp", "https://github.com/tldevapp"],
      },
      {
        "@type": "SoftwareApplication",
        name: "TL;Dev",
        description:
          "One-Shot Tech Learning for Serious Engineers. Daily tech shots on system design, backend, performance & more.",
        applicationCategory: "EducationalApplication",
        operatingSystem: ["Android", "iOS"],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          ratingCount: "100",
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
