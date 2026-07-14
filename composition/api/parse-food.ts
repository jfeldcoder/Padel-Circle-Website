import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

export const config = { maxDuration: 15 };

const MAX_INPUT_CHARS = 1000;

const SYSTEM_PROMPT = `You are a nutrition estimation engine. The user describes food they ate in natural language.

Return ONLY a JSON object — no markdown fences, no commentary, no explanations. The exact shape:

{"items":[{"name":"string","quantity":"string","calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}]}

Rules:
- One item per distinct food or drink mentioned.
- "quantity" is a short human-readable portion, e.g. "2 eggs", "1 slice", "8 oz".
- When portions are unspecified, assume reasonable typical US portion sizes.
- Estimate calories and macros as realistic numbers (calories as integers, macros may have one decimal).
- If the text does not describe any food or drink, return {"items":[]}.`;

interface ParsedItem {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

function coerceItem(raw: unknown): ParsedItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) return null;
  const num = (v: unknown): number => {
    const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  return {
    name,
    quantity: typeof o.quantity === "string" ? o.quantity : "",
    calories: Math.round(num(o.calories)),
    protein_g: num(o.protein_g),
    carbs_g: num(o.carbs_g),
    fat_g: num(o.fat_g),
  };
}

function stripFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  }
  // Fall back to the outermost JSON object if there's stray prose around it.
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first > 0 && last > first) t = t.slice(first, last + 1);
  return t;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    res.status(400).json({ error: "Missing 'text' in request body" });
    return;
  }
  if (text.length > MAX_INPUT_CHARS) {
    res.status(400).json({ error: `Input too long (max ${MAX_INPUT_CHARS} characters)` });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "Server is not configured" });
    return;
  }

  const client = new Anthropic({ timeout: 14_000, maxRetries: 1 });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripFences(raw));
    } catch {
      res.status(422).json({ error: "Couldn't parse that — try rephrasing." });
      return;
    }

    const rawItems = (parsed as { items?: unknown })?.items;
    if (!Array.isArray(rawItems)) {
      res.status(422).json({ error: "Couldn't parse that — try rephrasing." });
      return;
    }

    const items = rawItems.map(coerceItem).filter((i): i is ParsedItem => i !== null);
    if (items.length === 0) {
      res.status(422).json({ error: "Couldn't find any food in that — try rephrasing." });
      return;
    }

    const round1 = (n: number) => Math.round(n * 10) / 10;
    const totals = {
      calories: items.reduce((s, i) => s + i.calories, 0),
      protein_g: round1(items.reduce((s, i) => s + i.protein_g, 0)),
      carbs_g: round1(items.reduce((s, i) => s + i.carbs_g, 0)),
      fat_g: round1(items.reduce((s, i) => s + i.fat_g, 0)),
    };

    res.status(200).json({ items, totals });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      res.status(502).json({ error: "The nutrition service is unavailable — try again." });
      return;
    }
    res.status(500).json({ error: "Something went wrong — try again." });
  }
}
