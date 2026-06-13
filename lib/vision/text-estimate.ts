import Anthropic from '@anthropic-ai/sdk';
import type { EntryNutrition } from '@/lib/nutrition';
import {
  DEFAULT_MODEL, NUTRITION_PROPERTIES, NUTRITION_KEYS, parseNutrition,
  visionCostMicroUsd, type VisionUsage,
} from './index';

export interface TextNutritionResult {
  nutrition: EntryNutrition;
  confidence: number;
  usage: VisionUsage | null;
}

const SYSTEM = `You are a nutrition assistant. Given a dish name (usually German), estimate its
nutrition per 100 g (typical values) and a typical single-serving portion.
- portion_g: grams of a typical single serving.
- *_per_100g: nutrition per 100 g (energy in kcal, the rest in grams), best-effort, or null.
- confidence: 0..1 self-rated certainty.`;

// Same nutrition fields as the photo schema, minus the image-specific dish/ingredients.
const TEXT_SCHEMA = {
  type: 'object',
  properties: {
    ...NUTRITION_PROPERTIES,
    confidence: { type: 'number', description: '0..1 self-rated certainty in the estimate' },
  },
  required: [...NUTRITION_KEYS, 'confidence'],
  additionalProperties: false,
};

const EMPTY: EntryNutrition = {
  portionG: null, kcalPer100g: null, carbsGPer100g: null, sugarGPer100g: null,
  fatGPer100g: null, saturatedFatGPer100g: null, proteinGPer100g: null,
  fiberGPer100g: null, saltGPer100g: null,
};

/**
 * Text-only nutrition estimate for a dish name (reused by the Food edit flow). Returns
 * per-100 g values + a default portion, plus a usage row to log to `vision_usage`
 * (byte/dimension fields = 0 to denote a text call).
 */
export async function estimateNutritionFromText(dish: string): Promise<TextNutritionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { nutrition: EMPTY, confidence: 0, usage: null };

  const model = process.env.VISION_MODEL ?? DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model,
    max_tokens: 400,
    system: SYSTEM,
    messages: [{ role: 'user', content: [{ type: 'text', text: `Dish: ${dish}` }] }],
    output_config: { format: { type: 'json_schema', schema: TEXT_SCHEMA } },
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  let nutrition = EMPTY;
  let confidence = 0;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const j = JSON.parse(jsonMatch[0]);
      nutrition = parseNutrition(j);
      confidence = typeof j.confidence === 'number' ? j.confidence : 0;
    } catch { /* keep EMPTY */ }
  }

  return { nutrition, confidence, usage: textUsage(model, message.usage, confidence) };
}

export interface DrinkEstimateResult {
  alcoholGPer100ml: number | null;
  sugarGPer100ml: number | null;
  confidence: number;
  usage: VisionUsage | null;
}

const DRINK_SYSTEM = `You are a nutrition assistant. Given a drink name (usually German),
estimate its content per 100 ml.
- alcohol_g_per_100ml: grams of pure alcohol per 100 ml (= ABV% × 0.789). Water/juice/soda ≈ 0.
- sugar_g_per_100ml: grams of sugar per 100 ml, or null.
- confidence: 0..1 self-rated certainty.`;

const NUM_OR_NULL = { anyOf: [{ type: 'number' }, { type: 'null' }] };
const DRINK_SCHEMA = {
  type: 'object',
  properties: {
    alcohol_g_per_100ml: { ...NUM_OR_NULL, description: 'grams pure alcohol per 100 ml' },
    sugar_g_per_100ml: { ...NUM_OR_NULL, description: 'grams sugar per 100 ml' },
    confidence: { type: 'number', description: '0..1 self-rated certainty' },
  },
  required: ['alcohol_g_per_100ml', 'sugar_g_per_100ml', 'confidence'],
  additionalProperties: false,
};

/**
 * Text-only per-100 ml estimate for a drink name (reused by the bot `/drink` and Drinks edit).
 * Volume is supplied by the user, not the AI. Usage logged like the food text estimate.
 */
export async function estimateDrinkFromText(name: string): Promise<DrinkEstimateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { alcoholGPer100ml: null, sugarGPer100ml: null, confidence: 0, usage: null };

  const model = process.env.VISION_MODEL ?? DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model,
    max_tokens: 200,
    system: DRINK_SYSTEM,
    messages: [{ role: 'user', content: [{ type: 'text', text: `Drink: ${name}` }] }],
    output_config: { format: { type: 'json_schema', schema: DRINK_SCHEMA } },
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  let alcoholGPer100ml: number | null = null;
  let sugarGPer100ml: number | null = null;
  let confidence = 0;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const j = JSON.parse(jsonMatch[0]);
      alcoholGPer100ml = typeof j.alcohol_g_per_100ml === 'number' ? j.alcohol_g_per_100ml : null;
      sugarGPer100ml = typeof j.sugar_g_per_100ml === 'number' ? j.sugar_g_per_100ml : null;
      confidence = typeof j.confidence === 'number' ? j.confidence : 0;
    } catch { /* keep nulls */ }
  }

  return { alcoholGPer100ml, sugarGPer100ml, confidence, usage: textUsage(model, message.usage, confidence) };
}

/** Build a VisionUsage row for a text-only call (byte/dimension fields = 0). */
function textUsage(model: string, u: { input_tokens: number; output_tokens: number }, confidence: number): VisionUsage {
  return {
    model,
    srcBytes: 0,
    sentBytes: 0,
    width: 0,
    height: 0,
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    costMicroUsd: visionCostMicroUsd(u.input_tokens, u.output_tokens),
    visionConfidence: confidence,
    downsampleMs: 0,
  };
}
