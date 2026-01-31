export interface ViewMoreLink {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface SerpApiResult {
  organic_results?: Array<{
    position: number;
    title: string;
    link: string;
    snippet: string;
    displayed_link: string;
  }>;
}

const SERPAPI_BASE = "https://serpapi.com/search.json";

const TRUSTED_DOMAINS = [
  "developer.mozilla.org",
  "docs.microsoft.com",
  "learn.microsoft.com",
  "cloud.google.com",
  "aws.amazon.com",
  "docs.docker.com",
  "kubernetes.io",
  "reactjs.org",
  "react.dev",
  "nodejs.org",
  "python.org",
  "typescriptlang.org",
  "github.com",
  "stackoverflow.com",
  "dev.to",
  "medium.com",
  "freecodecamp.org",
  "css-tricks.com",
  "smashingmagazine.com",
  "web.dev",
  "digitalocean.com",
];

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function scoreResult(result: { link: string; snippet: string }): number {
  const domain = extractDomain(result.link);
  let score = 0;

  if (TRUSTED_DOMAINS.some((d) => domain.includes(d))) {
    score += 10;
  }

  if (domain.endsWith(".org") || domain.endsWith(".edu")) {
    score += 5;
  }

  if (domain.includes("docs") || domain.includes("developer")) {
    score += 3;
  }

  if (result.snippet.length > 100) {
    score += 2;
  }

  return score;
}

export async function searchViewMoreLink(
  tipText: string,
  category: string
): Promise<ViewMoreLink | null> {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    console.error("SERPAPI_KEY not configured");
    return null;
  }

  const keywords = tipText
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(" ")
    .filter(
      (w) =>
        w.length > 3 &&
        ![
          "this",
          "that",
          "here",
          "there",
          "what",
          "why",
          "how",
          "the",
          "and",
          "for",
          "with",
          "from",
          "most",
          "devs",
          "developers",
          "never",
          "stop",
          "using",
        ].includes(w.toLowerCase())
    )
    .slice(0, 4)
    .join(" ");

  const searchQuery = `${keywords} ${category} best practices tutorial`;

  try {
    const params = new URLSearchParams({
      engine: "bing",
      q: searchQuery,
      cc: "US",
      api_key: apiKey,
    });

    const response = await fetch(`${SERPAPI_BASE}?${params.toString()}`);

    if (!response.ok) {
      console.error(`SerpAPI error: ${response.status}`);
      return null;
    }

    const data: SerpApiResult = await response.json();

    if (!data.organic_results?.length) {
      return null;
    }

    const scoredResults = data.organic_results
      .map((result) => ({
        ...result,
        score: scoreResult(result),
      }))
      .sort((a, b) => b.score - a.score);

    const bestResult = scoredResults[0];

    return {
      title: bestResult.title,
      url: bestResult.link,
      snippet: bestResult.snippet?.slice(0, 200) || "",
      source: extractDomain(bestResult.link),
    };
  } catch (error) {
    console.error("SerpAPI search error:", error);
    return null;
  }
}

export async function searchMultipleLinks(
  tips: Array<{ tipText: string; category: string }>
): Promise<Map<string, ViewMoreLink | null>> {
  const results = new Map<string, ViewMoreLink | null>();

  for (const tip of tips) {
    const link = await searchViewMoreLink(tip.tipText, tip.category);
    results.set(tip.tipText, link);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return results;
}
