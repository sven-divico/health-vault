import { attemptLoginByCode, consumeInvite, getUserByTelegramId } from '@/lib/auth';
import { createFoodPhotoEntry, createFoodTextEntry } from '@/lib/food';
import { saveImage } from '@/lib/images';
import { parseActivity } from '@/lib/measures/activity-parse';
import { recordActivity, recordMood, recordWeight } from '@/lib/measures';
import { interpretMealImage } from '@/lib/vision';
import { estimateDrinkFromText } from '@/lib/vision/text-estimate';
import { recordVisionUsage } from '@/lib/vision/usage';
import { absoluteNutrition } from '@/lib/nutrition';
import { absoluteDrink } from '@/lib/drinks';
import { createDrinkEntry } from '@/lib/drinks/queries';
import { parseDrink } from '@/lib/drinks/parse';
import { t } from '@/lib/i18n/de';
import { downloadFile, getFile, sendMessage } from './api';
import type { TelegramMessage, TelegramUpdate } from './types';

export async function dispatchUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg || !msg.from) return;
  try {
    await handleMessage(msg);
  } catch (e) {
    console.error('[telegram] handler error:', e);
    await safeReply(msg.chat.id, t.bot.genericError);
  }
}

async function handleMessage(msg: TelegramMessage): Promise<void> {
  const fromId = msg.from!.id;
  const chatId = msg.chat.id;
  const text = (msg.text ?? '').trim();

  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const token = parts[1];
    if (!token) {
      await sendMessage(chatId, t.bot.welcomeNoToken);
      return;
    }
    const result = consumeInvite(token, fromId);
    if (!result.ok) {
      const m = {
        invalid: t.bot.inviteInvalid,
        already_used: t.bot.inviteAlreadyUsed,
        telegram_already_linked: t.bot.telegramAlreadyLinked,
      }[result.reason];
      await sendMessage(chatId, m);
      return;
    }
    await sendMessage(chatId, t.bot.linked(escapeHtml(result.username)));
    return;
  }

  const user = getUserByTelegramId(fromId);
  if (!user) {
    await sendMessage(chatId, t.bot.notLinked);
    return;
  }

  // Photo? Treat as food.
  if (msg.photo && msg.photo.length > 0) {
    await handlePhoto(user.id, chatId, msg);
    return;
  }

  // Commands.
  if (text.startsWith('/weight')) {
    const rest = text.slice('/weight'.length).trim();
    const m = rest.match(/^(\d+(?:[.,]\d+)?)(?:\s+(.+))?$/);
    if (!m) {
      await sendMessage(chatId, t.bot.weightUsage);
      return;
    }
    const kg = parseFloat(m[1].replace(',', '.'));
    recordWeight(user.id, kg, m[2]);
    await sendMessage(chatId, t.bot.weightLogged(kg.toFixed(1)));
    return;
  }

  if (text.startsWith('/mood')) {
    const rest = text.slice('/mood'.length).trim();
    const m = rest.match(/^([1-5])(?:\s+(.+))?$/);
    if (!m) {
      await sendMessage(chatId, t.bot.moodUsage);
      return;
    }
    recordMood(user.id, Number(m[1]), m[2]);
    await sendMessage(chatId, t.bot.moodLogged(m[1]));
    return;
  }

  if (text.startsWith('/activity')) {
    const rest = text.slice('/activity'.length).trim();
    if (!rest) {
      await sendMessage(chatId, t.bot.activityUsage);
      return;
    }
    const parsed = parseActivity(rest);
    recordActivity(user.id, parsed);
    const label = parsed.category ?? t.measures.activityFallback;
    const dur = parsed.durationMin != null ? t.bot.activityDurSuffix(parsed.durationMin) : '';
    const hint = parsed.durationMin == null ? t.bot.activityNoDuration : '';
    await sendMessage(chatId, t.bot.activityLogged(escapeHtml(label), dur, hint));
    return;
  }

  if (text.startsWith('/drink')) {
    const rest = text.slice('/drink'.length).trim();
    const parsed = parseDrink(rest);
    if (!parsed) {
      await sendMessage(chatId, t.bot.drinkUsage);
      return;
    }
    const est = await estimateDrinkFromText(parsed.name);
    const entry = createDrinkEntry({
      userId: user.id,
      source: 'text',
      name: parsed.name,
      volumeMl: parsed.volumeMl,
      alcoholGPer100ml: est.alcoholGPer100ml,
      sugarGPer100ml: est.sugarGPer100ml,
      rawText: rest,
      visionConfidence: est.confidence,
    });
    if (est.usage) recordVisionUsage(user.id, null, est.usage, entry.id);
    const alcoholG = absoluteDrink(entry).alcoholG;
    const alcoholSuffix = alcoholG != null && alcoholG > 0 ? t.bot.drinkAlcoholSuffix(Math.round(alcoholG)) : '';
    await sendMessage(chatId, t.bot.drinkLogged(escapeHtml(parsed.name), t.bot.drinkVolMl(parsed.volumeMl), alcoholSuffix));
    return;
  }

  if (text.startsWith('/help')) {
    await sendMessage(chatId, t.bot.help);
    return;
  }

  // Two-digit login code?
  if (/^\d{2}$/.test(text)) {
    const ok = attemptLoginByCode(fromId, text);
    await sendMessage(chatId, ok ? t.bot.loggedInWeb : t.bot.noPendingLogin);
    return;
  }

  // Otherwise: free text → food entry.
  if (text.length > 0) {
    createFoodTextEntry({ userId: user.id, text });
    await sendMessage(chatId, t.bot.textLogged(escapeHtml(text.slice(0, 60))));
  }
}

async function handlePhoto(userId: number, chatId: number, msg: TelegramMessage): Promise<void> {
  const largest = msg.photo!.reduce((a, b) => (a.file_size ?? 0) > (b.file_size ?? 0) ? a : b);
  const fileInfo = await getFile(largest.file_id);
  if (!fileInfo) {
    await sendMessage(chatId, t.bot.photoFetchFailed);
    return;
  }
  const buf = await downloadFile(fileInfo.file_path);
  const ext = fileInfo.file_path.split('.').pop()?.toLowerCase() ?? 'jpg';
  const relPath = await saveImage(userId, buf, ext);
  const { interpretation, usage } = await interpretMealImage(buf);
  const entry = createFoodPhotoEntry({
    userId,
    imagePath: relPath,
    caption: msg.caption,
    interpretation,
  });
  if (usage) recordVisionUsage(userId, entry.id, usage);

  const label = interpretation.dishName ?? t.bot.mealUnrecognised;
  const kcalAbs = absoluteNutrition(interpretation).kcal;
  const kcal = kcalAbs != null ? t.bot.photoKcalSuffix(Math.round(kcalAbs)) : '';
  let extra = '';
  if (usage && (process.env.VISION_SHOW_USAGE ?? 'true') !== 'false') {
    const cost = (usage.costMicroUsd / 1e6).toFixed(4);
    extra = `\n📷 ${usage.width}×${usage.height} · ${usage.inputTokens}/${usage.outputTokens} tok · ~$${cost} · ${usage.downsampleMs}ms`;
  }
  await sendMessage(chatId, t.bot.photoLogged(escapeHtml(label), kcal, extra));
}

async function safeReply(chatId: number, text: string) {
  try { await sendMessage(chatId, text); } catch {}
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
