CREATE TABLE `vision_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`food_entry_id` integer,
	`logged_at` integer NOT NULL,
	`model` text NOT NULL,
	`src_bytes` integer NOT NULL,
	`sent_bytes` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`cost_micro_usd` integer NOT NULL,
	`vision_confidence` real,
	`downsample_ms` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`food_entry_id`) REFERENCES `food_entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `vision_usage_user_time_idx` ON `vision_usage` (`user_id`,`logged_at`);