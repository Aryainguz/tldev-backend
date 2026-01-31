export interface UnsplashImage {
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  unsplashId: string;
  author: string;
  authorUrl: string;
  downloadUrl: string;
}

interface UnsplashApiResponse {
  id: string;
  width: number;
  height: number;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  links: {
    download_location: string;
  };
}

const UNSPLASH_API_BASE = "https://api.unsplash.com";

const CATEGORY_SEARCH_MAP: Record<string, string> = {
  JavaScript: "javascript code programming",
  Python: "python programming code",
  React: "react programming interface",
  TypeScript: "typescript code developer",
  DevOps: "devops server infrastructure",
  Cloud: "cloud computing server",
  Docker: "container technology server",
  Kubernetes: "kubernetes cloud infrastructure",
  Git: "git version control code",
  Database: "database server technology",
  Web: "web development code",
  AI: "artificial intelligence technology",
  Security: "cybersecurity technology",
  Testing: "software testing code",
  "Node.js": "nodejs server programming",
  AWS: "aws cloud computing",
  Go: "golang programming code",
  Rust: "rust programming code",
  CSS: "css web design",
  Mobile: "mobile app development",
};

export async function getUnsplashImage(
  category: string
): Promise<UnsplashImage | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    console.error("UNSPLASH_ACCESS_KEY not configured");
    return null;
  }

  const searchQuery =
    CATEGORY_SEARCH_MAP[category] || `${category} programming technology`;

  try {
    const response = await fetch(
      `${UNSPLASH_API_BASE}/photos/random?query=${encodeURIComponent(
        searchQuery
      )}&orientation=portrait&content_filter=high`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Unsplash API error: ${response.status}`);
      return null;
    }

    const data: UnsplashApiResponse = await response.json();

    await fetch(data.links.download_location, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    }).catch(() => {});

    return {
      url: data.urls.regular,
      thumbUrl: data.urls.thumb,
      width: data.width,
      height: data.height,
      unsplashId: data.id,
      author: data.user.name,
      authorUrl: data.user.links.html,
      downloadUrl: data.links.download_location,
    };
  } catch (error) {
    console.error("Unsplash fetch error:", error);
    return null;
  }
}

export async function getMultipleUnsplashImages(
  categories: string[]
): Promise<Map<string, UnsplashImage | null>> {
  const results = new Map<string, UnsplashImage | null>();

  for (const category of categories) {
    const image = await getUnsplashImage(category);
    results.set(category, image);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}
