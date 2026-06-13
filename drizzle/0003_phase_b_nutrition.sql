ALTER TABLE `food_entries` DROP COLUMN `estimated_kcal`;
--> statement-breakpoint
ALTER TABLE `food_entries` ADD `portion_g` real;
--> statement-breakpoint
ALTER TABLE `food_entries` ADD `kcal_per_100g` real;
--> statement-breakpoint
ALTER TABLE `food_entries` ADD `carbs_g_per_100g` real;
--> statement-breakpoint
ALTER TABLE `food_entries` ADD `sugar_g_per_100g` real;
--> statement-breakpoint
ALTER TABLE `food_entries` ADD `fat_g_per_100g` real;
--> statement-breakpoint
ALTER TABLE `food_entries` ADD `saturated_fat_g_per_100g` real;
--> statement-breakpoint
ALTER TABLE `food_entries` ADD `protein_g_per_100g` real;
--> statement-breakpoint
ALTER TABLE `food_entries` ADD `fiber_g_per_100g` real;
--> statement-breakpoint
ALTER TABLE `food_entries` ADD `salt_g_per_100g` real;
