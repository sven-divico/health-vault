import { requireUser } from '@/lib/auth/server';
import { listFoodEntries } from '@/lib/food';

export const dynamic = 'force-dynamic';

export default async function FoodPage() {
  const user = await requireUser();
  const entries = listFoodEntries(user.id, 200);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Food log</h1>
      <ul className="space-y-2">
        {entries.map((f) => (
          <li key={f.id} className="flex items-start gap-3 rounded border border-neutral-200 p-3 dark:border-neutral-800">
            {f.imagePath && (
              <img src={`/api/images/${f.imagePath}`} alt="" className="h-20 w-20 rounded object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium">{f.dishName ?? f.rawText ?? '(no label)'}</div>
              <div className="text-xs text-neutral-500">
                {new Date(f.loggedAt).toLocaleString()}
                {f.estimatedKcal ? ` · ~${f.estimatedKcal} kcal` : ''}
                {f.source === 'photo' && f.visionConfidence != null ? ` · vision ${(f.visionConfidence * 100).toFixed(0)}%` : ''}
              </div>
              {f.ingredientsJson && (
                <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  {(JSON.parse(f.ingredientsJson) as string[]).join(', ')}
                </div>
              )}
              {f.source === 'photo' && f.rawText && (
                <div className="mt-1 text-xs italic text-neutral-500">“{f.rawText}”</div>
              )}
            </div>
          </li>
        ))}
        {entries.length === 0 && <li className="text-sm text-neutral-500">No entries yet.</li>}
      </ul>
    </div>
  );
}
