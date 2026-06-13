CREATE TABLE `drink_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`logged_at` integer NOT NULL,
	`source` text NOT NULL,
	`name` text,
	`volume_ml` real NOT NULL,
	`alcohol_g_per_100ml` real,
	`sugar_g_per_100ml` real,
	`raw_text` text,
	`vision_confidence` real,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `drink_user_time_idx` ON `drink_entries` (`user_id`,`logged_at`);--> statement-breakpoint
ALTER TABLE `vision_usage` ADD `drink_entry_id` integer REFERENCES drink_entries(id);