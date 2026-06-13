# Vision Token Optimization — Design Spec

Date: 2026-06-13
Status: Approved (design), implementing
Related: `vault/actions-log.md` (image-detection token review)

## Goal
Reduce and make observable the token cost of meal-photo recognition
(`lib/vision/index.ts`). Downsample images before sending to Claude (tunable),
switch JSON parsing to Haiku 4.5 structured outputs, surface token/cost in the bot
reply, and log per-call size/tokens/cost/confidence/latency to the DB for evaluation.

## Decisions (from discussion)
- **Downsample ourselves** (deterministic cap), not "pick a smaller Telegram size"
  (fuzzy, depends on original upload). Parameterized via env so it's tunable.
- **Library: `jimp` (pure JS)**, not `sharp`. Avoids native-module packaging in the
  Next.js standalone Docker build (sharp would need explicit binary copies; jimp is traced
  automatically). Speed is a non-issue for one image; we log `downsampleMs` anyway.
- **Structured outputs** via the SDK's `messages.parse()` + `zodOutputFormat` schema
  (`output_config.format`). Eliminates the brittle regex-extract + silent `confidence:0`
  failure path. Requires upgrading `@anthropic-ai/sdk` to a current version + adding `zod`.
- **Keep Haiku 4.5** (`claude-haiku-4-5-20251001`) — cheapest tier, right for the task.

## Behaviour
1. **Downsample** (`lib/vision`): before base64, shrink to fit `VISION_MAX_EDGE` (default
   **768**) px long edge (never enlarge), re-encode JPEG at `VISION_JPEG_QUALITY` (default
   **80**). Measure `downsampleMs`. The **full-res original is still saved to disk** by the
   existing `saveImage` — only the API copy shrinks. On downsample error, fall back to the
   original buffer (degrade gracefully).
2. **Recognise**: `client.messages.parse()` with the image + a `zodOutputFormat` schema
   (`dish_name|null`, `ingredients[]`, `estimated_kcal|null`, `confidence`). Read
   `parsed_output` and `usage.{input_tokens,output_tokens}`.
3. **Cost**: Haiku 4.5 = $1/1M input, $5/1M output. Since $1/1M = 1 µUSD/token, store
   `costMicroUsd = inputTokens * 1 + outputTokens * 5` (exact integer). Pure helper, tested.
4. **Bot reply**: append a usage line when `VISION_SHOW_USAGE !== 'false'` (default on), e.g.
   `📷 768×576 · 1180/92 tok · ~$0.0019 · 41ms`.
5. **Log**: insert one `vision_usage` row per call.

## Data model — new table `vision_usage`
```
id            integer pk autoincrement
user_id       integer not null  → users.id
food_entry_id integer           → food_entries.id (nullable)
logged_at     timestamp not null
model         text not null
src_bytes     integer not null   -- original buffer size
sent_bytes    integer not null   -- downsampled (sent) size
width         integer not null   -- sent image dimensions
height        integer not null
input_tokens  integer not null
output_tokens integer not null
cost_micro_usd integer not null
vision_confidence real            -- model self-rated confidence (0..1)
downsample_ms integer not null
```
One Drizzle migration adds the table; applied via the existing lazy `migrate()` on first
request after deploy (prod `__drizzle_migrations` is in sync → clean apply).

## Interfaces
- `interpretMealImage(buffer, mediaType?) → { interpretation: MealInterpretation, usage: VisionUsage | null }`
  (`usage` null when no API key). Existing `MealInterpretation` shape unchanged so
  `createFoodPhotoEntry` is untouched.
- `recordVisionUsage(userId, foodEntryId, usage)` — thin DB insert (`lib/vision/usage.ts`).
- `visionCostMicroUsd(inputTokens, outputTokens) → number` — pure, unit-tested.
- `lib/telegram/dispatch.ts` `handlePhoto`: call → save entry → record usage → reply
  (with optional usage line).

## Config (all optional, code defaults; no server change required)
`VISION_MAX_EDGE=768`, `VISION_JPEG_QUALITY=80`, `VISION_SHOW_USAGE=true`,
`VISION_MODEL=claude-haiku-4-5-20251001`.

## Out of scope
Adaptive multi-pass (small-then-large), a usage dashboard page (the table is the dataset;
visualize later via the existing Insights stack), `sharp` for speed.

## Verification
- Unit test `visionCostMicroUsd` (e.g. 1180 in + 92 out → 1180 + 460 = 1640 µUSD).
- `npm run build` succeeds; confirm `.next/standalone/node_modules/jimp` is bundled.
- Deploy; send a real photo to @eat_0042_bot; confirm reply shows the usage line and a
  `vision_usage` row is written with sane numbers.
