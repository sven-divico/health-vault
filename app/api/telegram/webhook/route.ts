import { NextResponse } from 'next/server';
import { dispatchUpdate } from '@/lib/telegram/dispatch';
import type { TelegramUpdate } from '@/lib/telegram/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const provided = req.headers.get('x-telegram-bot-api-secret-token');
  if (expected && provided !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const update = (await req.json()) as TelegramUpdate;
  // Fire-and-respond fast: Telegram retries on slow webhooks.
  dispatchUpdate(update).catch((e) => console.error('[webhook] dispatch failed:', e));
  return NextResponse.json({ ok: true });
}
