import http from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * A stand-in for the Telegram Bot API for tests (adapter, server, E2E): a local HTTP server with
 * the few methods the adapter uses. Updates are served until the client acknowledges them with a
 * higher `offset`, like the real thing. Not shipped to production (nothing imports it there).
 */
export interface FakeBotApi {
	/** Pass as `apiRoot`. */
	url: string;
	/** A token this fake accepts. */
	token: string;
	/** Every call, in order (`file` for downloads). */
	calls: { method: string; payload: Record<string, unknown> }[];
	/** Payloads of `sendMessage`, in order; each got `message_id` = index + 1. */
	sent(): { chat_id: number; text: string; reply_markup?: unknown; parse_mode?: string }[];
	/** The inline keyboard of the `index`-th sent message (empty when it has none). */
	keyboard(index: number): { text: string; callback_data?: string; url?: string }[][];
	callsOf(method: string): Record<string, unknown>[];
	/** Highest `offset` a client sent to `getUpdates`. */
	lastOffset(): number;
	/** Queues an incoming update; returns its `update_id`. */
	queue(update: Record<string, unknown>): number;
	say(userId: number, text: string, extra?: Record<string, unknown>): number;
	sendPhoto(userId: number, bytes: Uint8Array, caption?: string): number;
	sendDocument(
		userId: number,
		name: string,
		mime: string,
		bytes: Uint8Array,
		size?: number,
	): number;
	/** A voice note (Opus in Ogg), with its audio. */
	sendVoice(userId: number, bytes?: Uint8Array): number;
	press(userId: number, messageId: number, data: string, markup?: unknown): number;
	/** The next call of `method` fails with this Bot API error. */
	failNext(method: string, errorCode: number, description: string, parameters?: object): void;
	/** `getUpdates` answers 409 while true (another poller). */
	setConflict(on: boolean): void;
	/** Updates still waiting to be acknowledged. */
	pending(): number;
	close(): Promise<void>;
}

const TOKEN = '123456:fake-token-ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export async function startFakeBotApi(
	options: { token?: string; username?: string } = {},
): Promise<FakeBotApi> {
	const token = options.token ?? TOKEN;
	const username = options.username ?? 'family_test_bot';
	const botId = Number(token.split(':')[0]);
	const calls: FakeBotApi['calls'] = [];
	const sentMessages: ReturnType<FakeBotApi['sent']> = [];
	const files = new Map<string, Uint8Array>();
	const failures = new Map<string, { code: number; description: string; parameters?: object }[]>();
	let updates: { update_id: number; [key: string]: unknown }[] = [];
	let nextUpdateId = 1000;
	let conflict = false;
	let offset = 0;
	let wake: (() => void) | undefined;

	const ok = (res: http.ServerResponse, result: unknown) => {
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end(JSON.stringify({ ok: true, result }));
	};
	const fail = (
		res: http.ServerResponse,
		code: number,
		description: string,
		parameters?: object,
	) => {
		res.writeHead(code, { 'content-type': 'application/json' });
		res.end(
			JSON.stringify({
				ok: false,
				error_code: code,
				description,
				...(parameters && { parameters }),
			}),
		);
	};

	const server = http.createServer((req, res) => {
		const chunks: Buffer[] = [];
		req.on('data', (c: Buffer) => chunks.push(c));
		req.on('end', async () => {
			const url = req.url ?? '';
			const file = /^\/file\/bot([^/]+)\/(.+)$/.exec(url);
			if (file) {
				calls.push({ method: 'file', payload: { path: file[2] } });
				const bytes = files.get(decodeURIComponent(file[2] as string).replace(/^docs\//, ''));
				if (file[1] !== token || !bytes) return fail(res, 404, 'Not Found');
				res.writeHead(200, { 'content-type': 'application/octet-stream' });
				return res.end(Buffer.from(bytes));
			}
			const match = /^\/bot([^/]+)\/(\w+)$/.exec(url);
			if (!match) return fail(res, 404, 'Not Found');
			const method = match[2] as string;
			if (match[1] !== token) return fail(res, 401, 'Unauthorized');
			const raw = Buffer.concat(chunks).toString();
			const payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
			calls.push({ method, payload });
			const queued = failures.get(method)?.shift();
			if (queued) return fail(res, queued.code, queued.description, queued.parameters);

			switch (method) {
				case 'getMe':
					return ok(res, { id: botId, is_bot: true, first_name: 'Family', username });
				case 'deleteWebhook':
				case 'answerCallbackQuery':
				case 'editMessageReplyMarkup':
				case 'sendChatAction':
					return ok(res, true);
				case 'sendMessage': {
					sentMessages.push(payload as ReturnType<FakeBotApi['sent']>[number]);
					return ok(res, {
						message_id: sentMessages.length,
						date: 1,
						chat: { id: payload.chat_id, type: 'private' },
					});
				}
				case 'getFile': {
					const id = String(payload.file_id);
					const bytes = files.get(id);
					if (!bytes) return fail(res, 400, 'Bad Request: invalid file_id');
					return ok(res, {
						file_id: id,
						file_unique_id: id,
						file_size: bytes.length,
						file_path: `docs/${id}`,
					});
				}
				case 'getUpdates': {
					if (conflict)
						return fail(
							res,
							409,
							'Conflict: terminated by other getUpdates request; make sure that only one bot instance is running',
						);
					offset = Math.max(offset, Number(payload.offset ?? 0));
					updates = updates.filter((u) => u.update_id >= offset);
					if (updates.length === 0) {
						// Hold the request open like long polling, but only briefly.
						await new Promise<void>((resolve) => {
							const timer = setTimeout(resolve, 250);
							wake = () => {
								clearTimeout(timer);
								resolve();
							};
							res.on('close', resolve);
						});
					}
					if (res.destroyed) return;
					return ok(
						res,
						updates.filter((u) => u.update_id >= offset),
					);
				}
				default:
					return fail(res, 404, 'Not Found');
			}
		});
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

	let fileCount = 0;
	const addFile = (bytes: Uint8Array) => {
		const id = `file${++fileCount}`;
		files.set(id, bytes);
		return id;
	};
	const user = (id: number) => ({
		id,
		is_bot: false,
		first_name: `User${id}`,
		username: `user${id}`,
	});
	const message = (userId: number, rest: Record<string, unknown>) => ({
		message: {
			message_id: ++fileCount + 500,
			date: 1,
			chat: { id: userId, type: 'private' },
			from: user(userId),
			...rest,
		},
	});

	const api: FakeBotApi = {
		url,
		token,
		calls,
		sent: () => sentMessages,
		keyboard: (index) =>
			(
				sentMessages[index]?.reply_markup as
					| { inline_keyboard?: ReturnType<FakeBotApi['keyboard']> }
					| undefined
			)?.inline_keyboard ?? [],
		callsOf: (method) => calls.filter((c) => c.method === method).map((c) => c.payload),
		lastOffset: () => offset,
		queue(update) {
			const update_id = nextUpdateId++;
			updates.push({ update_id, ...update });
			wake?.();
			return update_id;
		},
		say: (userId, text, extra) => api.queue(message(userId, { text, ...extra })),
		sendPhoto: (userId, bytes, caption) =>
			api.queue(
				message(userId, {
					photo: [
						{
							file_id: addFile(new Uint8Array([1])),
							file_unique_id: 's',
							width: 90,
							height: 90,
							file_size: 1,
						},
						{
							file_id: addFile(bytes),
							file_unique_id: 'l',
							width: 1280,
							height: 960,
							file_size: bytes.length,
						},
					],
					...(caption && { caption }),
				}),
			),
		sendDocument: (userId, name, mime, bytes, size) =>
			api.queue(
				message(userId, {
					document: {
						file_id: addFile(bytes),
						file_unique_id: 'd',
						file_name: name,
						mime_type: mime,
						file_size: size ?? bytes.length,
					},
				}),
			),
		sendVoice: (userId, bytes = new Uint8Array([79, 103, 103, 83])) =>
			api.queue(
				message(userId, {
					voice: {
						file_id: addFile(bytes),
						file_unique_id: 'v',
						duration: 3,
						mime_type: 'audio/ogg',
						file_size: bytes.length,
					},
				}),
			),
		press: (userId, messageId, data, markup) =>
			api.queue({
				callback_query: {
					id: `cb${nextUpdateId}`,
					from: user(userId),
					chat_instance: 'x',
					data,
					message: {
						message_id: messageId,
						date: 1,
						chat: { id: userId, type: 'private' },
						...(markup !== undefined && { reply_markup: markup }),
					},
				},
			}),
		failNext(method, code, description, parameters) {
			const list = failures.get(method) ?? [];
			list.push({ code, description, ...(parameters && { parameters }) });
			failures.set(method, list);
		},
		setConflict(on) {
			conflict = on;
			wake?.();
		},
		pending: () => updates.filter((u) => u.update_id >= offset).length,
		close: () =>
			new Promise<void>((resolve) => {
				server.closeAllConnections();
				server.close(() => resolve());
			}),
	};
	return api;
}
