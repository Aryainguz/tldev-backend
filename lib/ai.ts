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
  "System Design",
  "Performance",
  "Data Structures",
  "Algorithms",
  "Security",
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
  "How [Company] uses [Tech] to [outcome]",
  "[Company] saves [amount] with [Tech]",
  "Why [Company] switched from [old] to [new]",
  "[Company]'s [Tech] handles [scale] daily",
  "[Company] cut [metric] by [%] using [Tech]",
  "Inside [Company]'s [Tech] architecture",
  "[Company] dropped [old]. Here's what replaced it",
  "The [Tech] trick [Company] uses at scale",
  "[Company] processes [number] requests with [Tech]",
  "Why [Company] built their own [Tech]",
  "[Company]'s [Tech] reduced downtime by [%]",
  "How [Company] migrated [scale] to [Tech]",
  "[Company] replaced [old] and got [number]x speed",
  "[Company]'s secret: [Tech] for [outcome]",
  "What [Company] learned after [Tech] failed",
] as const;

const REAL_WORLD_COMPANIES = [
  "Netflix",
  "Spotify",
  "Uber",
  "Airbnb",
  "LinkedIn",
  "Stripe",
  "Shopify",
  "Discord",
  "Slack",
  "Atlassian",
  "Meta",
  "Google",
  "Twitter/X",
  "GitHub",
  "Cloudflare",
  "Vercel",
  "Supabase",
  "Figma",
  "Notion",
  "Datadog",
  "Pinterest",
  "DoorDash",
  "Instacart",
  "Coinbase",
  "Canva",
  "Reddit",
  "Twitch",
  "Dropbox",
  "PayPal",
  "Square",
] as const;

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
    .min(20)
    .describe(
      "REQUIRED: Language comment first line (// JavaScript, # Python, etc), then 5-15 lines of runnable code. ALWAYS provide code.",
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
  code_snippet: string;
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
Objective: produce EXACTLY ${count} COMPLETELY UNIQUE tips based on REAL engineering stories from real companies.

═══════════════════════════════════════════════════════════════
CORE IDENTITY: REAL-WORLD ENGINEERING STORIES
═══════════════════════════════════════════════════════════════
Every tip MUST be based on a real engineering decision, migration, architecture choice, or incident from a real tech company.
Reference actual blog posts, tech talks, open-source projects, or well-known engineering practices.
DO NOT invent fake company stories. Use real, verifiable engineering facts.

Example headlines that define our style:
- "Netflix Uses Binary Trees to Optimize Stream Quality"
- "LinkedIn's Graph DB Handles 2M Queries/sec"
- "Atlassian Saves $8M/yr With Protobuf Migration"
- "Discord Stores Trillions of Messages Using Rust"
- "Uber Cut Microservice Latency 40% With gRPC"
- "Shopify Handles 80K RPS on Black Friday With Lua"
- "Figma's Multiplayer Uses CRDTs, Not OT"

Companies to reference (use DIFFERENT company per tip):
${REAL_WORLD_COMPANIES.join(", ")}

═══════════════════════════════════════════════════════════════
IMPORTANT GLOBAL RULES
═══════════════════════════════════════════════════════════════
- ZERO duplicates: no two tips may share the same primary_tech, unique_topic slug, headline pattern, or company
- EVERY headline MUST name a real company + real tech + specific metric/outcome
- BANNED WORDS in headlines: ultimate, insane, amazing, awesome, powerful, magic, simple
- Each tip must reference a DIFFERENT real company
${previousTechsStr}

═══════════════════════════════════════════════════════════════
ALLOWED CATEGORIES: ${selectedCategories.join(", ")}
═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
STEP A — PLANNING (DO THIS FIRST MENTALLY)
═══════════════════════════════════════════════════════════════
Before generating, plan ${count} tips ensuring:
1. Each unique_topic slug is DIFFERENT
2. Each primary_tech is DIFFERENT (e.g., Protobuf, CRDTs, gRPC, Binary Trees, Kafka - use each ONLY ONCE)
3. Each headline_pattern is DIFFERENT
4. Each company is DIFFERENT (one company per tip)
5. Each story is based on REAL engineering decisions (blog posts, talks, open-source)

Available headline patterns (use each ONLY ONCE):
${HEADLINE_PATTERNS.map((p, i) => `${i + 1}. "${p}"`).join("\n")}

═══════════════════════════════════════════════════════════════
STEP B — GENERATION RULES (per tip)
═══════════════════════════════════════════════════════════════

tip_text (HEADLINE):
- Max 60 chars
- MUST name a real company + real technology + specific number/outcome
- Follow ONE of the headline patterns above (different for each tip)
- Examples: "Stripe Processes 1M TPS With Ruby" or "Airbnb Cut Deploy Time 70% With Bazel"

tip_summary (80-150 chars):
- 1-2 sentences expanding the real-world engineering story
- Mention the company context, the problem they faced, and the result

tip_detail (500-800 chars) - STRICT STRUCTURE with EXPLICIT LABELS:
Each section MUST start on a new line with its label prefix. The content should tell the REAL engineering story:
HOOK: [1-2 sentences — the real problem the company faced at scale]
TENSION: [2-3 sentences — what they tried before and why it failed]
PAYOFF: [3-4 sentences — what they actually built/adopted and the real results]
WHEN_NOT_TO_USE: [1-2 sentences — when this approach doesn't apply]
FAILURE_STORY: [1 sentence — "Common mistake: specific real-world pitfall"]
TAKEAWAY: [1 actionable line — "TL;DR: what you can adopt today"]
IMPORTANT: Each label (HOOK:, TENSION:, PAYOFF:, WHEN_NOT_TO_USE:, FAILURE_STORY:, TAKEAWAY:) MUST appear literally at the start of its section, separated by newlines. Do NOT omit labels or merge sections.

code_snippet (REQUIRED):
- First line MUST be language comment: // JavaScript, # Python, -- SQL, etc.
- 5-15 lines of RUNNABLE code demonstrating the core technique from the story
- Show the actual pattern/algorithm/config the company uses
- For architecture topics: show real config, proto definitions, or algorithm implementation
- EVERY tip MUST have code. NO EXCEPTIONS.

primary_tech:
- The specific technology/concept (e.g., "Protobuf", "CRDTs", "B-Trees", "gRPC", "Kafka")
- MUST be unique across all ${count} tips

headline_pattern:
- Which pattern from the list you used
- MUST be unique across all ${count} tips

claim_provenance:
- For ANY numeric claim, specify: "benchmark-based" | "production-observed" | "community-reported" | "estimated-range"
- Prefer "production-observed" since these are real company stories

═══════════════════════════════════════════════════════════════
GENERATE EXACTLY ${count} TIPS NOW
═══════════════════════════════════════════════════════════════
Remember:
- ${count} different REAL companies (one per tip)
- ${count} unique primary_tech values
- ${count} unique headline_pattern values  
- ${count} unique unique_topic slugs
- Every headline: [Company] + [Tech] + [Specific metric/outcome]
- Stories must be based on real, verifiable engineering decisions
- NO banned words, NO generic advice — only real-world engineering`;

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
        code_snippet: tip.code_snippet,
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
