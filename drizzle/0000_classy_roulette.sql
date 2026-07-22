CREATE TABLE `beta_signups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`plan` text NOT NULL,
	`consent` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `beta_signups_email_unique` ON `beta_signups` (`email`);