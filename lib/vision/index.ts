import Anthropic from '@anthropic-ai/sdk';
import jpeg from 'jpeg-js';

export interface MealInterpretation {
  dishName: string | null;
  ingredients: string[];
  estimatedKcal: number | null;
  confidence: number;
  raw: string;
}

export interface VisionUsage {
  model: string;
  srcBytes: number;
  sentBytes: number;
  width: number;
  height: number;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
  visionConfidence: number | null;
  downsampleMs: number;
}

export interface MealResult {
  interpretation: MealInterpretation;
  usage: VisionUsage | null;
}

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM = `You are a nutrition assistant. Identify the meal in the photo.
- dish_name: short common name (e.g. "Spaghetti Carbonara"), or null if not a meal.
- ingredients: best-effort list of visible components.
- estimated_kcal: rough total for the visible portion, integer, or null.
- confidence: 0..1 self-rated certainty in the dish identification.`;

// JSON Schema for structured outputs (output_config.format). All properties required +
// additionalProperties:false per the structured-outputs contract; nullables via anyOf.
const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    dish_name: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'short common dish name, or null if not a meal' },
    ingredients: { type: 'array', items: { type: 'string' }, description: 'visible components' },
    estimated_kcal: { anyOf: [{ type: 'integer' }, { type: 'null' }], description: 'rough total kcal for the visible portion' },
    confidence: { type: 'number', description: '0..1 self-rated certainty in the identification' },
  },
  required: ['dish_name', 'ingredients', 'estimated_kcal', 'confidence'],
  additionalProperties: false,
};

/**
 * Haiku 4.5 pricing: $1 / 1M input tokens, $5 / 1M output tokens.
 * $1/1M == 1 micro-USD per token, so the cost in micro-USD is an exact integer.
 */
export function visionCostMicroUsd(inputTokens: number, outputTokens: number): number {
  return inputTokens * 1 + outputTokens * 5;
}

function emptyInterpretation(raw: string): MealInterpretation {
  return { dishName: null, ingredients: [], estimatedKcal: null, confidence: 0, raw };
}

export interface Downsampled { data: Buffer; width: number; height: number }

/** Box-filter (area-average) downscale of an RGBA buffer — anti-aliased, no new deps. */
function boxResize(src: Uint8Array, sw: number, sh: number, dw: number, dh: number): Uint8Array {
  const dst = new Uint8Array(dw * dh * 4);
  const xRatio = sw / dw;
  const yRatio = sh / dh;
  for (let y = 0; y < dh; y++) {
    const sy0 = Math.floor(y * yRatio);
    const sy1 = Math.max(sy0 + 1, Math.min(sh, Math.floor((y + 1) * yRatio)));
    for (let x = 0; x < dw; x++) {
      const sx0 = Math.floor(x * xRatio);
      const sx1 = Math.max(sx0 + 1, Math.min(sw, Math.floor((x + 1) * xRatio)));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * sw + sx) * 4;
          r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3]; n++;
        }
      }
      const di = (y * dw + x) * 4;
      dst[di] = r / n; dst[di + 1] = g / n; dst[di + 2] = b / n; dst[di + 3] = a / n;
    }
  }
  return dst;
}

/**
 * Decode a JPEG, shrink to fit `maxEdge` on the long edge (never enlarge), re-encode at
 * `quality`. Pure JS (jpeg-js), no native deps. Exported for tests. Throws on a non-decodable
 * buffer — callers should catch and fall back to the original.
 */
export function downsampleJpeg(buffer: Buffer, maxEdge: number, quality: number): Downsampled {
  const img = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
  const sw = img.width;
  const sh = img.height;
  const longEdge = Math.max(sw, sh);
  const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const rgba = scale < 1 ? boxResize(img.data as Uint8Array, sw, sh, dw, dh) : (img.data as Uint8Array);
  const out = jpeg.encode({ data: Buffer.from(rgba), width: dw, height: dh }, quality);
  return { data: Buffer.from(out.data), width: dw, height: dh };
}

interface DownsampleResult extends Downsampled { ms: number }

/**
 * Env-parameterized downsample with timing and graceful fallback to the original buffer.
 */
function downsample(buffer: Buffer): DownsampleResult {
  const maxEdge = Number(process.env.VISION_MAX_EDGE ?? 768);
  const quality = Number(process.env.VISION_JPEG_QUALITY ?? 80);
  const t0 = Date.now();
  try {
    const r = downsampleJpeg(buffer, maxEdge, quality);
    return { ...r, ms: Date.now() - t0 };
  } catch {
    return { data: buffer, width: 0, height: 0, ms: Date.now() - t0 };
  }
}

export async function interpretMealImage(buffer: Buffer): Promise<MealResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { interpretation: emptyInterpretation('(no api key)'), usage: null };
  }

  const ds = downsample(buffer);
  const model = process.env.VISION_MODEL ?? DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });
  const data = ds.data.toString('base64');

  const message = await client.messages.create({
    model,
    max_tokens: 400,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
          { type: 'text', text: 'Identify this meal.' },
        ],
      },
    ],
    output_config: { format: { type: 'json_schema', schema: MEAL_SCHEMA } },
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  const interpretation = parseInterpretation(text);

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const usage: VisionUsage = {
    model,
    srcBytes: buffer.length,
    sentBytes: ds.data.length,
    width: ds.width,
    height: ds.height,
    inputTokens,
    outputTokens,
    costMicroUsd: visionCostMicroUsd(inputTokens, outputTokens),
    visionConfidence: interpretation.confidence,
    downsampleMs: ds.ms,
  };

  return { interpretation, usage };
}

function parseInterpretation(text: string): MealInterpretation {
  // Structured outputs guarantee schema-valid JSON; this is defensive only.
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return emptyInterpretation(text);
  try {
    const j = JSON.parse(jsonMatch[0]);
    return {
      dishName: typeof j.dish_name === 'string' ? j.dish_name : null,
      ingredients: Array.isArray(j.ingredients) ? j.ingredients.filter((x: unknown) => typeof x === 'string') : [],
      estimatedKcal: typeof j.estimated_kcal === 'number' ? j.estimated_kcal : null,
      confidence: typeof j.confidence === 'number' ? j.confidence : 0,
      raw: text,
    };
  } catch {
    return emptyInterpretation(text);
  }
}
