import { z } from 'zod';

export const TelegramStateSchema = z.enum([
	/** No bot connected. */
	'off',
	/** A bot is connected; the poller has not reported yet. */
	'pending',
	'ok',
	/** Another instance polls with the same token (HTTP 409). */
	'conflict',
	/** Telegram no longer accepts the token. */
	'invalid_token',
	/** Telegram cannot be reached. */
	'offline',
	/** The token cannot be read (FAMOS_SECRET changed). */
	'unreadable',
]);

export const TelegramStatusSchema = z.object({
	configured: z.boolean(),
	botUsername: z.string().nullable(),
	state: TelegramStateSchema,
	checkedAt: z.number().int().nullable(),
});
export type TelegramStatus = z.infer<typeof TelegramStatusSchema>;

export const TokenInputSchema = z.object({ token: z.string().trim().min(1).max(200).nullable() });

export const LinkCodeSchema = z.object({
	code: z.string(),
	url: z.string(),
	expiresAt: z.number().int(),
});
export type LinkCode = z.infer<typeof LinkCodeSchema>;

export const MemberLinkSchema = z.object({
	/** Whether the admin has connected a bot, so linking is possible at all. */
	available: z.boolean(),
	botUsername: z.string().nullable(),
	linked: z.boolean(),
	username: z.string().nullable(),
});
export type MemberLink = z.infer<typeof MemberLinkSchema>;
