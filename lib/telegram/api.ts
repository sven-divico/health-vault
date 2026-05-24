const API_BASE = 'https://api.telegram.org';

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN not set');
  return t;
}

export async function sendMessage(chatId: number, text: string): Promise<void> {
  await fetch(`${API_BASE}/bot${token()}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

export async function getFile(fileId: string): Promise<{ file_path: string } | null> {
  const res = await fetch(`${API_BASE}/bot${token()}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!res.ok) return null;
  const j = await res.json() as { ok: boolean; result?: { file_path: string } };
  return j.ok && j.result ? j.result : null;
}

export async function downloadFile(filePath: string): Promise<Buffer> {
  const res = await fetch(`${API_BASE}/file/bot${token()}/${filePath}`);
  if (!res.ok) throw new Error(`telegram file download failed: ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
