import Anthropic from '@anthropic-ai/sdk';

export interface MealInterpretation {
  dishName: string | null;
  ingredients: string[];
  estimatedKcal: number | null;
  confidence: number;
  raw: string;
}

const SYSTEM = `You are a nutrition assistant. Identify the meal in the photo.
Respond with strict JSON only, no prose, matching this shape:
{"dish_name": string|null, "ingredients": string[], "estimated_kcal": number|null, "confidence": number}
- dish_name: short common name (e.g. "Spaghetti Carbonara"), or null if not a meal.
- ingredients: best-effort list of visible components.
- estimated_kcal: rough total for the visible portion, integer, or null.
- confidence: 0..1 self-rated certainty in the dish identification.`;

export async function interpretMealImage(buffer: Buffer, mediaType: string = 'image/jpeg'): Promise<MealInterpretation> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { dishName: null, ingredients: [], estimatedKcal: null, confidence: 0, raw: '(no api key)' };
  }
  const client = new Anthropic({ apiKey });
  const data = buffer.toString('base64');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg', data } },
          { type: 'text', text: 'Identify this meal. JSON only.' },
        ],
      },
    ],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  return parseInterpretation(text);
}

function parseInterpretation(text: string): MealInterpretation {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const raw = text;
  if (!jsonMatch) {
    return { dishName: null, ingredients: [], estimatedKcal: null, confidence: 0, raw };
  }
  try {
    const j = JSON.parse(jsonMatch[0]);
    return {
      dishName: typeof j.dish_name === 'string' ? j.dish_name : null,
      ingredients: Array.isArray(j.ingredients) ? j.ingredients.filter((x: unknown) => typeof x === 'string') : [],
      estimatedKcal: typeof j.estimated_kcal === 'number' ? j.estimated_kcal : null,
      confidence: typeof j.confidence === 'number' ? j.confidence : 0,
      raw,
    };
  } catch {
    return { dishName: null, ingredients: [], estimatedKcal: null, confidence: 0, raw };
  }
}
