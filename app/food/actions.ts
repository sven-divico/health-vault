'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import {
  getFoodEntry, deleteFoodEntryById, updateFoodEntryPortion, updateFoodEntryDish,
} from '@/lib/food';
import { deleteImage } from '@/lib/images';
import { estimateNutritionFromText } from '@/lib/vision/text-estimate';
import { recordVisionUsage, unlinkVisionUsageFood } from '@/lib/vision/usage';
import type { EntryNutrition } from '@/lib/nutrition';
import { t } from '@/lib/i18n/de';

export type ActionResult = { ok: true; warning?: string } | { ok: false; error: string };

const EMPTY_NUTRITION: EntryNutrition = {
  portionG: null, kcalPer100g: null, carbsGPer100g: null, sugarGPer100g: null,
  fatGPer100g: null, saturatedFatGPer100g: null, proteinGPer100g: null,
  fiberGPer100g: null, saltGPer100g: null,
};

export async function deleteFoodEntry(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const entry = getFoodEntry(id);
  if (!entry || entry.userId !== user.id) return { ok: false, error: 'forbidden' };
  if (entry.imagePath) deleteImage(user.id, entry.imagePath);
  unlinkVisionUsageFood(id); // drop the FK reference before deleting the row
  deleteFoodEntryById(id);
  revalidatePath('/food');
  return { ok: true };
}

export async function updateFoodEntry(
  id: number,
  input: { dishName: string; portionG: number | null },
): Promise<ActionResult> {
  const user = await requireUser();
  const entry = getFoodEntry(id);
  if (!entry || entry.userId !== user.id) return { ok: false, error: 'forbidden' };

  const dishName = input.dishName.trim();
  if (!dishName) return { ok: false, error: t.food.dishRequired };
  if (input.portionG != null && !(input.portionG > 0)) return { ok: false, error: t.food.portionInvalid };

  const dishChanged = dishName !== (entry.dishName ?? '');

  if (dishChanged) {
    // Re-estimate per-100 g nutrition from the new dish name; keep the user's portion if set.
    let warning: string | undefined;
    try {
      const est = await estimateNutritionFromText(dishName);
      const nutrition: EntryNutrition = { ...est.nutrition, portionG: input.portionG ?? est.nutrition.portionG };
      updateFoodEntryDish(id, dishName, nutrition);
      if (est.usage) recordVisionUsage(user.id, id, est.usage);
      if (est.nutrition.kcalPer100g == null) warning = t.food.estimateFailed;
    } catch {
      updateFoodEntryDish(id, dishName, { ...EMPTY_NUTRITION, portionG: input.portionG ?? null });
      warning = t.food.estimateFailed;
    }
    revalidatePath('/food');
    return warning ? { ok: true, warning } : { ok: true };
  }

  // Dish unchanged → portion-only update; absolutes recompute on read (no AI).
  if (input.portionG != null) updateFoodEntryPortion(id, input.portionG);
  revalidatePath('/food');
  return { ok: true };
}
