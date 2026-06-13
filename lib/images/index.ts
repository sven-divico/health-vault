import { mkdirSync, createReadStream, statSync, existsSync, unlinkSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, resolve, normalize, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

function imageRoot(): string {
  return resolve(process.env.IMAGE_DIR ?? './data/images');
}

export async function saveImage(userId: number, buffer: Buffer, ext = 'jpg'): Promise<string> {
  const root = imageRoot();
  const userDir = join(root, String(userId));
  mkdirSync(userDir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(join(userDir, name), buffer);
  return `${userId}/${name}`;
}

export function resolveImagePath(userId: number, relative: string): string | null {
  const root = imageRoot();
  const userDir = resolve(join(root, String(userId)));
  const candidate = resolve(join(root, relative));
  const normalized = normalize(candidate);
  if (!normalized.startsWith(userDir + sep) && normalized !== userDir) return null;
  if (!existsSync(normalized)) return null;
  return normalized;
}

/** Delete a user's image file (path-traversal-safe; no-op if missing). */
export function deleteImage(userId: number, relative: string): void {
  const abs = resolveImagePath(userId, relative);
  if (!abs) return;
  try { unlinkSync(abs); } catch { /* already gone — ignore */ }
}

export function streamImage(absolutePath: string) {
  const stat = statSync(absolutePath);
  return { stream: createReadStream(absolutePath), size: stat.size };
}
