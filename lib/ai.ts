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
    .max(150)
    .describe(
      "Viral clickbait headline - bold claims, company names, urgency. Max 60 chars ideal",
    ),
  tip_summary: z
    .string()
    .max(400)
    .describe(
      "Concise feed preview - 1-2 sentences explaining the key insight (80-150 chars ideal)",
    ),
  tip_detail: z
    .string()
    .max(3000)
    .describe(
      "In-depth article explaining the topic - what it is, why it matters, practical examples (500-1000 chars ideal)",
    ),
  code_snippet: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Practical code example proving the claim. Can be null if conceptual.",
    ),
  category: z.enum(TIP_CATEGORIES as [string, ...string[]]),
  tags: z.array(z.string()).max(10).describe("2-4 lowercase tags"),
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

═══════════════════════════════════════════════════════════════
STEP 1: UNIQUENESS SELF-CHECK (MANDATORY)
═══════════════════════════════════════════════════════════════
Before generating ANY content, you MUST:
1. List all ${count} unique_topic slugs you plan to use
2. Verify NONE overlap with each other
3. For EACH tip, provide a 1-line reason: "Why this is fresh: [reason]"

═══════════════════════════════════════════════════════════════
STEP 2: TOPIC SELECTION RULES
═══════════════════════════════════════════════════════════════
ALLOWED - Pick from these FRESH areas (combine across categories!):
- Edge + AI: "RAG on Cloudflare Workers", "Vector search at edge"
- Rust + Web: "Rust WASM components", "Tauri vs Electron"
- Go + Cloud: "Go Lambda cold starts", "Go + DynamoDB single-table"
- Database + Performance: "Postgres partial indexes", "SQLite WAL mode"
- Security + API: "OAuth 2.1 changes", "API key rotation strategies"
- Testing + AI: "LLM output testing", "Snapshot testing for AI"
- Mobile + Performance: "React Native Fabric renderer", "Hermes engine internals"
- Frontend + Edge: "Astro hybrid rendering", "Qwik resumability"
- DevOps + Security: "SLSA compliance", "Sigstore for containers"
- Observability + Cost: "FinOps for cloud", "Cardinality explosion fixes"

FORBIDDEN - Never repeat the same TECHNOLOGY twice in ${count} tips:
- If you use "Cloudflare" in tip 1, NO other tip can mention Cloudflare
- If you use "PostgreSQL" in tip 1, NO other tip can mention PostgreSQL
- Each tip = unique primary technology

═══════════════════════════════════════════════════════════════
STEP 3: CONTENT STRUCTURE
═══════════════════════════════════════════════════════════════

tip_text (HEADLINE) - Max 60 chars, use VARIETY in endings:
CRITICAL: Each tip MUST use a DIFFERENT ending phrase. NEVER repeat!

Available patterns (use each ONLY ONCE across all ${count} tips):
- "[Company] does X. Here's how"
- "[Tech] cuts [metric] by [%]. See why"
- "Your [thing] is broken. Fix it"
- "[Number]x faster with [tech]"
- "Stop using [old]. Try [new]"
- "[Tech] secret [company] won't tell you"
- "I switched to [tech]. Never going back"
- "[Tech] in 2026: What changed"
- "The [tech] mistake costing you [outcome]"
- "Why [company] abandoned [old] for [new]"
- "[Tech] is dead. Long live [new]"
- "Boost [metric] with [tech] now"
- "The truth about [tech] performance"
- "How [company] scales with [tech]"
- "The [tech] hack saving [time/money]"

Try to use numbers, company names, and specific outcomes and feel free to try more patterns as long as they are unique.
BANNED words: "ultimate", "insane", "amazing", "awesome", "powerful", "magic"
REQUIRED: Specific outcome or number in EVERY headline

tip_summary (80-150 chars):
- Expand the headline with ONE concrete benefit
- Include the "what" and "why" in 1-2 sentences

tip_detail (500-800 chars) - MUST follow this structure:
1. HOOK (1-2 sentences): Start with a problem or surprising fact
2. TENSION (2-3 sentences): Why current solutions fail or what most devs get wrong
3. PAYOFF (3-4 sentences): The solution, how it works, key insight
4. WHEN NOT TO USE (1-2 sentences): Clear anti-pattern or limitation
5. FAILURE STORY (1 sentence): "Common mistake: [specific error]"
6. TAKEAWAY (1 line): "TL;DR: [actionable 1-liner]"

code_snippet:
- MUST specify language in first line as comment: // JavaScript, # Python, etc.
- Choose ONE format: minimal runnable (5-15 lines) OR pseudo-code (clear structure)
- null ONLY for pure architecture/process topics

═══════════════════════════════════════════════════════════════
STEP 4: CLAIM VALIDATION
═══════════════════════════════════════════════════════════════
For ANY numerical claim (speed, cost, percentage), you MUST:
- Add qualifier: "(benchmark-based)" OR "(production-observed)" OR "(community-reported)"
- If no source possible, use ranges: "2-5x faster" instead of exact numbers

═══════════════════════════════════════════════════════════════
GENERATE EXACTLY ${count} TIPS NOW
═══════════════════════════════════════════════════════════════
Categories to use: ${selectedCategories.join(", ")}

Output format for each tip:
- tip_text: Viral headline (pattern A/B/C/D)
- tip_summary: 1-2 sentence expansion
- tip_detail: Hook → Tension → Payoff → When NOT → Failure → Takeaway
- code_snippet: With language comment, or null
- category: From list above
- tags: 2-4 lowercase
- unique_topic: Unique slug (verify not banned!)`;

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
      code_snippet: tip.code_snippet ?? null,
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
