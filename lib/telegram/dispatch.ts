import { attemptLoginByCode, consumeInvite, getUserByTelegramId } from '@/lib/auth';
import { createFoodPhotoEntry, createFoodTextEntry } from '@/lib/food';
import { saveImage } from '@/lib/images';
import { parseActivity } from '@/lib/measures/activity-parse';
import { recordActivity, recordMood, recordWeight } from '@/lib/measures';
import { interpretMealImage } from '@/lib/vision';
import { recordVisionUsage } from '@/lib/vision/usage';
import { downloadFile, getFile, sendMessage } from './api';
import type { TelegramMessage, TelegramUpdate } from './types';

export async function dispatchUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg || !msg.from) return;
  try {
    await handleMessage(msg);
  } catch (e) {
    console.error('[telegram] handler error:', e);
    await safeReply(msg.chat.id, 'Sorry, something went wrong handling that message.');
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
      await sendMessage(chatId, 'Welcome. To bind this account use: /start &lt;invite-token&gt;');
      return;
    }
    const result = consumeInvite(token, fromId);
    if (!result.ok) {
      const m = {
        invalid: 'Invite token not recognised.',
        already_used: 'That invite token has already been used.',
        telegram_already_linked: 'This Telegram account is already linked.',
      }[result.reason];
      await sendMessage(chatId, m);
      return;
    }
    await sendMessage(chatId, `Linked. Welcome, <b>${escapeHtml(result.username)}</b>.`);
    return;
  }

  const user = getUserByTelegramId(fromId);
  if (!user) {
    await sendMessage(chatId, 'This Telegram account is not linked. Ask the admin for an invite link.');
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
      await sendMessage(chatId, 'Usage: /weight 82.4 [optional note]');
      return;
    }
    const kg = parseFloat(m[1].replace(',', '.'));
    recordWeight(user.id, kg, m[2]);
    await sendMessage(chatId, `✓ weight ${kg.toFixed(1)} kg logged`);
    return;
  }

  if (text.startsWith('/mood')) {
    const rest = text.slice('/mood'.length).trim();
    const m = rest.match(/^([1-5])(?:\s+(.+))?$/);
    if (!m) {
      await sendMessage(chatId, 'Usage: /mood 1-5 [optional note]');
      return;
    }
    recordMood(user.id, Number(m[1]), m[2]);
    await sendMessage(chatId, `✓ mood ${m[1]} logged`);
    return;
  }

  if (text.startsWith('/activity')) {
    const rest = text.slice('/activity'.length).trim();
    if (!rest) {
      await sendMessage(chatId, 'Usage: /activity run 28min [optional note]');
      return;
    }
    const parsed = parseActivity(rest);
    recordActivity(user.id, parsed);
    const label = parsed.category ?? 'activity';
    const dur = parsed.durationMin != null ? ` · ${parsed.durationMin} min` : '';
    const hint = parsed.durationMin == null ? ' (no duration parsed — not graphable)' : '';
    await sendMessage(chatId, `✓ activity logged: <b>${escapeHtml(label)}</b>${dur}${hint}`);
    return;
  }

  if (text.startsWith('/help')) {
    await sendMessage(
      chatId,
      [
        '<b>Health Vault</b>',
        '/weight 82.4 — log weight (kg)',
        '/mood 1-5 [note] — log mood',
        '/activity run 28min [note] — log activity (duration is graphed)',
        'Plain text — logged as a food entry',
        'Photo (with optional caption) — meal photo, AI-identified',
        'Two-digit code — completes a pending web login',
      ].join('\n'),
    );
    return;
  }

  // Two-digit login code?
  if (/^\d{2}$/.test(text)) {
    const ok = attemptLoginByCode(fromId, text);
    await sendMessage(chatId, ok ? '✓ logged in on the web' : 'No pending login matches that code.');
    return;
  }

  // Otherwise: free text → food entry.
  if (text.length > 0) {
    createFoodTextEntry({ userId: user.id, text });
    await sendMessage(chatId, `✓ logged: ${escapeHtml(text.slice(0, 60))}`);
  }
}

async function handlePhoto(userId: number, chatId: number, msg: TelegramMessage): Promise<void> {
  const largest = msg.photo!.reduce((a, b) => (a.file_size ?? 0) > (b.file_size ?? 0) ? a : b);
  const fileInfo = await getFile(largest.file_id);
  if (!fileInfo) {
    await sendMessage(chatId, 'Could not retrieve the photo from Telegram.');
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

  const label = interpretation.dishName ?? '(unrecognised meal)';
  const kcal = interpretation.estimatedKcal != null ? ` ~${interpretation.estimatedKcal} kcal` : '';
  let extra = '';
  if (usage && (process.env.VISION_SHOW_USAGE ?? 'true') !== 'false') {
    const cost = (usage.costMicroUsd / 1e6).toFixed(4);
    extra = `\n📷 ${usage.width}×${usage.height} · ${usage.inputTokens}/${usage.outputTokens} tok · ~$${cost} · ${usage.downsampleMs}ms`;
  }
  await sendMessage(chatId, `✓ photo logged: <b>${escapeHtml(label)}</b>${kcal}${extra}`);
}

async function safeReply(chatId: number, text: string) {
  try { await sendMessage(chatId, text); } catch {}
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
