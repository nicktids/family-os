import { t, tDynamic } from '#lib/i18n.svelte.js';

/** A short code as a sentence: `http_403` -> "Access is refused…". */
export function reason(code: string): string {
	const plain = code.replace(/^retrying_/, '');
	const http = /^http_(\d+)$/.exec(plain);
	if (http) {
		const key = `app:backups_code_http_${http[1]}`;
		const known = ['401', '403', '404', '301', '302', '307', '308'].includes(http[1] ?? '');
		return known ? tDynamic(key) : t('backups_code_http_other', { status: http[1] ?? '' });
	}
	const key = `app:backups_code_${plain}`;
	const text = tDynamic(key);
	return text === key ? plain : text;
}
