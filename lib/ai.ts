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
    .max(180)
    .describe("Viral clickbait headline with specific stats"),
  tip_summary: z.string().max(80).describe("Short curiosity hook for timeline"),
  code_snippet: z.string().nullable().describe("Short code proving the claim"),
  category: z.enum(TIP_CATEGORIES as [string, ...string[]]),
  tags: z.array(z.string()).max(4).describe("2-4 lowercase tags"),
});

const TipsArraySchema = z.array(TipSchema);

export interface GeneratedTip {
  id: string;
  tip_text: string;
  tip_summary: string;
  code_snippet: string | null;
  category: string;
  tags: string[];
}

export async function generateTips(
  count: number = 15,
  categories?: string[]
): Promise<{ tips: GeneratedTip[]; model: string; error?: string }> {
  const selectedCategories = categories?.length
    ? categories
    : TIP_CATEGORIES.slice(0, Math.min(count, TIP_CATEGORIES.length));

  const prompt = `You are a viral tech content creator for TL;Dev, a mobile app for developers.
Generate ${count} unique, CLICKBAIT-style tech tips that developers can't resist clicking.

REQUIREMENTS:
- tip_text: Viral, curiosity-inducing headline with SPECIFIC stats or claims (max 180 chars)
  Examples of GOOD tip_text:
  - "GraphQL cuts API costs by 50% - here's the one trick"
  - "Why Protobuf is 10x faster than JSON (with benchmarks)"
  - "This CSS trick replaced 200 lines of JavaScript"
  - "Stop using console.log - use this instead"
  - "The React pattern Netflix uses for 60fps scrolling"
  - "Why senior devs never use 'else' statements"
  - "Docker multi-stage builds cut image size by 90%"
  
- tip_summary: Even shorter hook for timeline (max 80 chars), create urgency/curiosity
  Examples: "Most devs don't know this...", "This changes everything", "Why nobody talks about this"
  
- code_snippet: Short, practical code that proves the claim. null if no code needed
- category: One of: ${selectedCategories.join(", ")}
- tags: 2-4 relevant lowercase tags

STYLE RULES:
- Use specific numbers/percentages when possible ("50% faster", "10x smaller", "3 lines")
- Create curiosity gaps ("here's why", "the truth about", "what they don't tell you")
- Reference big companies when relevant ("how Stripe", "what Google uses")
- Challenge common practices ("stop using X", "why X is wrong")
- Promise transformation ("from X to Y", "before/after")
- Keep it punchy - no fluff words

Generate exactly ${count} tips with good category distribution. Make each one irresistible to click!`;

  const { model, modelId } = getModel();

  try {
    const { object } = await generateObject({
      model: model as Parameters<typeof generateObject>[0]["model"],
      schema: TipsArraySchema,
      prompt,
      temperature: 0.2,
      maxTokens: 4000,
    });

    const tips: GeneratedTip[] = object.map((tip) => ({
      id: uuidv4(),
      tip_text: tip.tip_text,
      tip_summary: tip.tip_summary,
      code_snippet: tip.code_snippet,
      category: tip.category,
      tags: tip.tags,
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
  category?: string
): Promise<{ tip: GeneratedTip | null; model: string; error?: string }> {
  const result = await generateTips(1, category ? [category] : undefined);
  return {
    tip: result.tips[0] || null,
    model: result.model,
    error: result.error,
  };
}
