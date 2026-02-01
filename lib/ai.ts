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

const HEADLINE_PATTERNS = [
  "[Company] does X. Here's how",
  "[Tech] cuts [metric] by [%]. See why",
  "Your [thing] is broken. Fix it",
  "[Number]x faster with [tech]",
  "Stop using [old]. Try [new]",
  "[Tech] secret [company] won't tell you",
  "I switched to [tech]. Never going back",
  "[Tech] in 2026: What changed",
  "The [tech] mistake costing you [outcome]",
  "Why [company] abandoned [old] for [new]",
  "[Tech] is dead. Long live [new]",
  "Boost [metric] with [tech] now",
  "The truth about [tech] performance",
  "How [company] scales with [tech]",
  "The [tech] hack saving [time/money]",
];

const TipSchema = z.object({
  tip_text: z
    .string()
    .max(150)
    .describe("Viral headline max 60 chars, specific outcome/number required"),
  tip_summary: z
    .string()
    .max(400)
    .describe("80-150 chars, 1-2 sentences with what + benefit"),
  tip_detail: z
    .string()
    .max(3000)
    .describe(
      "500-800 chars: HOOK → TENSION → PAYOFF → WHEN_NOT → FAILURE → TAKEAWAY",
    ),
  code_snippet: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Language comment first line, 5-15 lines runnable or pseudo-code, null if architectural",
    ),
  category: z.enum(TIP_CATEGORIES as [string, ...string[]]),
  tags: z.array(z.string()).max(10).describe("2-4 lowercase tags"),
  unique_topic: z.string().describe("Unique slug e.g. 'rust-wasm-components'"),
  primary_tech: z
    .string()
    .describe("Single primary technology anchor for this tip"),
  headline_pattern: z.string().describe("The headline pattern used"),
  claim_provenance: z
    .enum([
      "benchmark-based",
      "production-observed",
      "community-reported",
      "estimated-range",
    ])
    .describe("Source type for any numeric claims"),
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
  previouslyUsedTechs?: string[],
): Promise<{ tips: GeneratedTip[]; model: string; error?: string }> {
  const selectedCategories = categories?.length
    ? categories
    : TIP_CATEGORIES.slice(0, Math.min(count, TIP_CATEGORIES.length));

  const previousTechsStr = previouslyUsedTechs?.length
    ? `previously_used_primary_techs = [${previouslyUsedTechs.join(", ")}]. DO NOT reuse these as primary_tech.`
    : "";

  const prompt = `You are a professional viral tech-content generator for TL;Dev (mobile app for developers).
Objective: produce EXACTLY ${count} COMPLETELY UNIQUE tips (no duplicates in topic, technology, headline pattern, or primary technology).

═══════════════════════════════════════════════════════════════
IMPORTANT GLOBAL RULES
═══════════════════════════════════════════════════════════════
- ZERO duplicates: no two tips may share the same primary_tech, unique_topic slug, headline pattern ending, or mention the same core product/company as the primary focus.
- BANNED WORDS in headlines: ultimate, insane, amazing, awesome, powerful, magic
${previousTechsStr}

═══════════════════════════════════════════════════════════════
ALLOWED CATEGORIES: ${selectedCategories.join(", ")}
═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
STEP A — PLANNING (DO THIS FIRST MENTALLY)
═══════════════════════════════════════════════════════════════
Before generating, plan ${count} tips ensuring:
1. Each unique_topic slug is DIFFERENT
2. Each primary_tech is DIFFERENT (e.g., Cloudflare, PostgreSQL, Rust, Go, tRPC - use each ONLY ONCE)
3. Each headline_pattern is DIFFERENT

Available headline patterns (use each ONLY ONCE):
${HEADLINE_PATTERNS.map((p, i) => `${i + 1}. "${p}"`).join("\n")}

═══════════════════════════════════════════════════════════════
STEP B — GENERATION RULES (per tip)
═══════════════════════════════════════════════════════════════

tip_text (HEADLINE):
- Max 60 chars
- MUST include specific outcome or number
- Follow ONE of the headline patterns above (different for each tip)
- Use company names, bold claims, urgency

tip_summary (80-150 chars):
- 1-2 sentences expanding the headline
- Include the "what" and "why"

tip_detail (500-800 chars) - STRICT STRUCTURE:
1. HOOK (1-2 sentences): Problem or surprising fact
2. TENSION (2-3 sentences): Why current solutions fail
3. PAYOFF (3-4 sentences): The solution and key insight
4. WHEN_NOT_TO_USE (1-2 sentences): Clear anti-pattern
5. FAILURE_STORY (1 sentence): "Common mistake: [specific error]"
6. TAKEAWAY (1 line): "TL;DR: [actionable 1-liner]"

code_snippet:
- First line MUST be language comment: // JavaScript, # Python, -- SQL, etc.
- 5-15 lines runnable code OR clear pseudo-code
- null ONLY for pure architecture/process topics

primary_tech:
- Single word or bigram (e.g., "Cloudflare", "PostgreSQL", "Rust", "tRPC")
- MUST be unique across all ${count} tips

headline_pattern:
- Which pattern from the list you used
- MUST be unique across all ${count} tips

claim_provenance:
- For ANY numeric claim, specify: "benchmark-based" | "production-observed" | "community-reported" | "estimated-range"

═══════════════════════════════════════════════════════════════
GENERATE EXACTLY ${count} TIPS NOW
═══════════════════════════════════════════════════════════════
Remember:
- ${count} unique primary_tech values
- ${count} unique headline_pattern values  
- ${count} unique unique_topic slugs
- NO banned topics
- Specific numbers/outcomes in every headline`;

  const { model, modelId } = getModel();

  // Timeout after 50 seconds to stay within Vercel limits
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);

  try {
    const { object } = await generateObject({
      model: model as Parameters<typeof generateObject>[0]["model"],
      schema: TipsArraySchema,
      prompt,
      temperature: 0.4,
      maxTokens: 16000,
      abortSignal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Post-generation validation: check for duplicates
    const seenTopics = new Set<string>();
    const seenTechs = new Set<string>();
    const seenPatterns = new Set<string>();

    const validTips: GeneratedTip[] = [];

    for (const tip of object) {
      const topicLower = tip.unique_topic.toLowerCase();
      const techLower = tip.primary_tech.toLowerCase();
      const patternLower = tip.headline_pattern.toLowerCase();

      // Skip duplicates
      if (seenTopics.has(topicLower) || seenTechs.has(techLower)) {
        console.warn(
          `[AI] Skipping duplicate: topic=${topicLower}, tech=${techLower}`,
        );
        continue;
      }

      seenTopics.add(topicLower);
      seenTechs.add(techLower);
      seenPatterns.add(patternLower);

      validTips.push({
        id: uuidv4(),
        tip_text: tip.tip_text,
        tip_summary: tip.tip_summary,
        tip_detail: tip.tip_detail,
        code_snippet: tip.code_snippet ?? null,
        category: tip.category,
        tags: tip.tags,
        unique_topic: tip.unique_topic,
      });
    }

    console.log(
      `[AI] Generated ${object.length} tips, ${validTips.length} unique after dedup`,
    );

    return { tips: validTips, model: modelId };
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
