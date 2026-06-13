'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import {
  createDrinkEntry, getDrinkEntry, deleteDrinkEntryById,
  updateDrinkEntryVolume, updateDrinkEntryName,
} from '@/lib/drinks/queries';
import { estimateDrinkFromText } from '@/lib/vision/text-estimate';
import { recordVisionUsage, unlinkVisionUsageDrink } from '@/lib/vision/usage';
import type { VisionUsage } from '@/lib/vision';
import { t } from '@/lib/i18n/de';

export type ActionResult = { ok: true; warning?: string } | { ok: false; error: string };

export async function addDrinkEntry(input: {
  name: string; volumeMl: number; alcoholGPer100ml: number | null; sugarGPer100ml: number | null;
}): Promise<ActionResult> {
  const user = await requireUser();
  const name = input.name.trim();
  if (!name) return { ok: false, error: t.drinks.nameRequired };
  if (!(input.volumeMl > 0)) return { ok: false, error: t.drinks.volumeInvalid };

  // Estimate concentrations only when the user didn't override them.
  const overridden = input.alcoholGPer100ml != null || input.sugarGPer100ml != null;
  let alcohol = input.alcoholGPer100ml;
  let sugar = input.sugarGPer100ml;
  let confidence: number | null = null;
  let usage: VisionUsage | null = null;
  if (!overridden) {
    const est = await estimateDrinkFromText(name);
    alcohol = est.alcoholGPer100ml;
    sugar = est.sugarGPer100ml;
    confidence = est.confidence;
    usage = est.usage;
  }

  const entry = createDrinkEntry({
    userId: user.id, source: 'web', name, volumeMl: input.volumeMl,
    alcoholGPer100ml: alcohol, sugarGPer100ml: sugar, visionConfidence: confidence,
  });
  if (usage) recordVisionUsage(user.id, null, usage, entry.id);
  revalidatePath('/drinks');
  return { ok: true };
}

export async function deleteDrinkEntry(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const entry = getDrinkEntry(id);
  if (!entry || entry.userId !== user.id) return { ok: false, error: 'forbidden' };
  unlinkVisionUsageDrink(id); // drop the FK reference before deleting the row
  deleteDrinkEntryById(id);
  revalidatePath('/drinks');
  return { ok: true };
}

export async function updateDrinkEntry(id: number, input: { name: string; volumeMl: number | null }): Promise<ActionResult> {
  const user = await requireUser();
  const entry = getDrinkEntry(id);
  if (!entry || entry.userId !== user.id) return { ok: false, error: 'forbidden' };

  const name = input.name.trim();
  if (!name) return { ok: false, error: t.drinks.nameRequired };
  if (input.volumeMl != null && !(input.volumeMl > 0)) return { ok: false, error: t.drinks.volumeInvalid };

  const nameChanged = name !== (entry.name ?? '');
  let warning: string | undefined;

  if (nameChanged) {
    try {
      const est = await estimateDrinkFromText(name);
      updateDrinkEntryName(id, name, { alcoholGPer100ml: est.alcoholGPer100ml, sugarGPer100ml: est.sugarGPer100ml });
      if (est.usage) recordVisionUsage(user.id, null, est.usage, id);
      if (est.alcoholGPer100ml == null && est.sugarGPer100ml == null) warning = t.drinks.estimateFailed;
    } catch {
      updateDrinkEntryName(id, name, { alcoholGPer100ml: null, sugarGPer100ml: null });
      warning = t.drinks.estimateFailed;
    }
  }

  if (input.volumeMl != null) updateDrinkEntryVolume(id, input.volumeMl);
  revalidatePath('/drinks');
  return warning ? { ok: true, warning } : { ok: true };
}
