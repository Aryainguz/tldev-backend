import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getModel() {
  const provider = process.env.AI_PROVIDER || "gemini";
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    const modelId = process.env.OPENAI_MODEL || "gpt-4o-mini";
    return { model: openai(modelId), modelId: `openai/${modelId}` };
  }
  const modelId = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  return { model: google(modelId), modelId: `gemini/${modelId}` };
}

const TIP_CATEGORIES = [
  "JavaScript",
  "Python",
  "React",
  "TypeScript",
  "DevOps",
  "Cloud",
  "Docker",
  "Kubernetes",
  "Git",
  "Database",
  "Web",
  "AI",
  "Security",
  "Testing",
  "Node.js",
  "AWS",
  "Go",
  "Rust",
  "CSS",
  "Mobile",
];

const TipSchema = z.object({
  tip_text: z
    .string()
    .max(100)
    .describe(
      "Viral clickbait headline - bold claims, company names, urgency. Max 60 chars ideal",
    ),
  tip_summary: z
    .string()
    .max(250)
    .describe(
      "Concise feed preview - 1-2 sentences explaining the key insight (80-150 chars ideal)",
    ),
  tip_detail: z
    .string()
    .max(2000)
    .describe(
      "In-depth article explaining the topic - what it is, why it matters, practical examples (500-1000 chars ideal)",
    ),
  code_snippet: z
    .string()
    .nullable()
    .describe("Practical code example proving the claim"),
  category: z.enum(TIP_CATEGORIES as [string, ...string[]]),
  tags: z.array(z.string()).max(8).describe("2-4 lowercase tags"),
  unique_topic: z
    .string()
    .describe(
      "Unique identifier for this topic to avoid duplicates e.g. 'react-usememo-optimization' or 'docker-multistage-builds'",
    ),
});

const TipsArraySchema = z.array(TipSchema);

export interface GeneratedTip {
  id: string;
  tip_text: string;
  tip_summary: string;
  tip_detail: string;
  code_snippet: string | null;
  category: string;
  tags: string[];
  unique_topic: string;
}

export async function generateTips(
  count: number = 15,
  categories?: string[],
): Promise<{ tips: GeneratedTip[]; model: string; error?: string }> {
  const selectedCategories = categories?.length
    ? categories
    : TIP_CATEGORIES.slice(0, Math.min(count, TIP_CATEGORIES.length));

  const prompt = `You are a viral tech content creator for TL;Dev, a mobile app for developers.
Generate ${count} COMPLETELY UNIQUE tech tips that developers can't resist clicking.

CRITICAL - NO DUPLICATES:
- Each tip MUST cover a DIFFERENT topic/concept
- Use unique_topic field to ensure variety (e.g., "python-walrus-operator", "react-suspense-streaming")
- NEVER repeat topics like "pathlib", "console.log", etc. across tips
- Cover diverse areas: new language features, frameworks, tools, patterns, optimizations, security, testing, DevOps

REQUIREMENTS:
- tip_text: VIRAL clickbait headline that makes devs STOP scrolling. Max 60 chars.
  Write like tech Twitter/X influencers. Use company names, bold claims, imperatives.
  
  PERFECT examples (copy this style EXACTLY):
  - "Zomato serves 1 lakh orders with Kafka. Here's how"
  - "Protobuf can save you infra. Ditch JSON now"
  - "Netflix ditched REST for GraphQL. You should too"
  - "Stripe processes $1T with this DB pattern"
  - "Stop writing if-else. Senior devs use this"
  - "Uber cut latency 40% with one Redis trick"
  - "Your Docker images are 10x too big. Fix it"
  - "Google banned this JavaScript pattern. Here's why"
  - "This Python one-liner will mass your mind"
  - "AWS bill too high? Blame your queries"
  
  BAD examples (NEVER do this):
  - "Unlock Python's pathlib magic!" (too generic, boring)
  - "Learn about React Suspense" (no hook, no urgency)
  - "Introduction to TypeScript satisfies" (sounds like docs)
  
- tip_summary: Concise feed preview (80-150 chars)
  - 1-2 sentences that expand on the headline
  - Give the core insight without full explanation
  - This appears under the title on feed cards
  
- tip_detail: In-depth article content (500-1000 chars)
  - Start from scratch - assume reader is new to this topic
  - Explain the concept, why it exists, what problem it solves
  - Include practical use cases and when to use it
  - Add tips, gotchas, or best practices
  - This appears in the expanded modal view
  - Write in an engaging, educational tone
  
- code_snippet: Practical code example that demonstrates the concept. null only if purely conceptual
- category: One of: ${selectedCategories.join(", ")}
- tags: 2-4 relevant lowercase tags
- unique_topic: Unique slug identifying this specific topic (e.g., "typescript-satisfies-operator")

Generate exactly ${count} tips with MAXIMUM variety. Each must be a DIFFERENT topic!`;

  const { model, modelId } = getModel();

  // Timeout after 50 seconds to stay within Vercel limits
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);

  try {
    const { object } = await generateObject({
      model: model as Parameters<typeof generateObject>[0]["model"],
      schema: TipsArraySchema,
      prompt,
      temperature: 0.3,
      maxTokens: 16000,
      abortSignal: controller.signal,
    });

    clearTimeout(timeoutId);

    const tips: GeneratedTip[] = object.map((tip) => ({
      id: uuidv4(),
      tip_text: tip.tip_text,
      tip_summary: tip.tip_summary,
      tip_detail: tip.tip_detail,
      code_snippet: tip.code_snippet,
      category: tip.category,
      tags: tip.tags,
      unique_topic: tip.unique_topic,
    }));

    return { tips, model: modelId };
  } catch (error) {
    console.error("AI generation error:", error);
    return {
      tips: [],
      model: modelId,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function generateSingleTip(
  category?: string,
): Promise<{ tip: GeneratedTip | null; model: string; error?: string }> {
  const result = await generateTips(1, category ? [category] : undefined);
  return {
    tip: result.tips[0] || null,
    model: result.model,
    error: result.error,
  };
}
