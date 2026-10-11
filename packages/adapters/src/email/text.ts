/**
 * Mail is attacker-controlled. Everything the Inbox gets from a message goes through
 * here first: HTML becomes plain text on the server (nothing is rendered or fetched), and text
 * a person could not see is removed.
 */

/**
 * Characters that show nothing but can carry instructions to a model: zero-width and bidi
 * controls, soft hyphens, invisible operators, byte order marks, interlinear annotations, and
 * the "tag" block (U+E0000..U+E007F, used to smuggle hidden ASCII).
 */
const INVISIBLE: readonly (readonly [number, number])[] = [
	[0x00ad, 0x00ad],
	[0x061c, 0x061c],
	[0x115f, 0x1160],
	[0x17b4, 0x17b5],
	[0x180b, 0x180f],
	[0x200b, 0x200f],
	[0x202a, 0x202e],
	[0x2060, 0x206f],
	[0x3164, 0x3164],
	[0xfeff, 0xfeff],
	[0xffa0, 0xffa0],
	[0xfff9, 0xfffb],
	[0xe0000, 0xe007f],
];

/** Whether a character is invisible, or a control character other than tab and newline. */
function dropped(code: number): boolean {
	if (code < 32) return code !== 9 && code !== 10;
	if (code >= 0x7f && code <= 0x9f) return true;
	return INVISIBLE.some(([from, to]) => code >= from && code <= to);
}

function stripHidden(input: string): string {
	let out = '';
	for (const ch of input) if (!dropped(ch.codePointAt(0) ?? 0)) out += ch;
	return out;
}

/** Removes invisible characters, normalises line breaks and collapses runs of blank lines. */
export function cleanText(input: string): string {
	return stripHidden(input.replaceAll('\r\n', '\n').replaceAll('\r', '\n'))
		.replaceAll(String.fromCharCode(0xa0), ' ')
		.split('\n')
		.map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	copy: '©',
	reg: '®',
	hellip: '…',
	ndash: '–',
	mdash: '—',
	lsquo: '‘',
	rsquo: '’',
	ldquo: '“',
	rdquo: '”',
	zwnj: '\u200C',
	zwj: '\u200D',
	lrm: '\u200E',
	rlm: '\u200F',
	shy: '\u00AD',
	bull: '•',
	middot: '·',
	euro: '€',
	pound: '£',
	laquo: '«',
	raquo: '»',
};

function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, body: string) => {
		if (body[0] === '#') {
			const code =
				body[1]?.toLowerCase() === 'x' ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
			if (!Number.isInteger(code) || code <= 0 || code > 0x10ffff) return '';
			return String.fromCodePoint(code);
		}
		return NAMED_ENTITIES[body.toLowerCase()] ?? match;
	});
}

const VOID_TAGS = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]);
/** Elements whose content is never text for a reader. */
const DROPPED = new Set([
	'script',
	'style',
	'head',
	'title',
	'template',
	'noscript',
	'svg',
	'iframe',
	'object',
	'canvas',
	'audio',
	'video',
	'select',
	'button',
	'textarea',
]);
const BLOCKS = new Set([
	'p',
	'div',
	'section',
	'article',
	'header',
	'footer',
	'blockquote',
	'pre',
	'ul',
	'ol',
	'table',
	'tr',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'address',
	'center',
	'form',
	'fieldset',
	'dl',
	'dt',
	'dd',
]);

const TAG = /<!--[\s\S]*?(?:-->|$)|<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>?/g;
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function attributes(raw: string): Map<string, string> {
	const attrs = new Map<string, string>();
	for (const m of raw.matchAll(ATTR)) {
		const name = m[1]?.toLowerCase();
		if (name && !attrs.has(name)) attrs.set(name, decodeEntities(m[2] ?? m[3] ?? m[4] ?? ''));
	}
	return attrs;
}

const WHITE = /^(?:white|#fff(?:fff)?|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))$/i;

/** Whether inline styles or attributes make an element invisible to a reader. */
function hiddenElement(attrs: Map<string, string>): boolean {
	if (attrs.has('hidden')) return true;
	if (attrs.get('aria-hidden') === 'true') return true;
	const style = (attrs.get('style') ?? '').toLowerCase();
	if (!style) return false;
	const decl = new Map<string, string>();
	for (const part of style.split(';')) {
		const i = part.indexOf(':');
		if (i > 0)
			decl.set(
				part.slice(0, i).trim(),
				part
					.slice(i + 1)
					.replace('!important', '')
					.trim(),
			);
	}
	if (decl.get('display') === 'none') return true;
	if (decl.get('visibility') === 'hidden' || decl.get('visibility') === 'collapse') return true;
	if (/^0(?:\.0+)?(?:px|pt|em|rem|%)?$/.test(decl.get('font-size') ?? 'x')) return true;
	if (/^0(?:\.0+)?$/.test(decl.get('opacity') ?? 'x')) return true;
	if (
		/^0(?:\.0+)?(?:px|pt|em|rem|%)?$/.test(decl.get('max-height') ?? 'x') &&
		decl.get('overflow') === 'hidden'
	)
		return true;
	if (/^-\d{3,}/.test(decl.get('text-indent') ?? '')) return true;
	// White text on a white (or unset) background, the classic way to hide instructions.
	const color = decl.get('color');
	const bg = decl.get('background-color') ?? decl.get('background');
	if (color && WHITE.test(color) && (!bg || WHITE.test(bg))) return true;
	return false;
}

/**
 * Turns HTML into plain text without rendering anything and without fetching anything.
 *
 * Tags are dropped, line breaks and list items are kept, links whose address differs from their
 * text are written as `text (address)`, images (tracking pixels included) vanish, and elements a
 * reader would not see (`display:none`, `font-size:0`, white on white, `hidden`) are skipped with
 * everything inside them.
 */
export function htmlToText(html: string): string {
	const out: string[] = [];
	/** Open elements; `hidden` is inherited by everything inside. */
	const stack: { tag: string; hidden: boolean }[] = [];
	const link: { href: string; start: number }[] = [];
	let hiddenDepth = 0;
	let last = 0;

	const emit = (text: string) => {
		if (hiddenDepth === 0 && text) out.push(text);
	};
	const newline = () => {
		if (hiddenDepth === 0) out.push('\n');
	};

	for (const m of html.matchAll(TAG)) {
		emit(decodeEntities(html.slice(last, m.index)));
		last = (m.index ?? 0) + m[0].length;
		const tag = m[2]?.toLowerCase();
		if (!tag) continue; // a comment
		const closing = m[1] === '/';

		if (closing) {
			const at = stack.map((s) => s.tag).lastIndexOf(tag);
			if (at < 0) continue;
			while (stack.length > at) {
				const top = stack.pop();
				if (top?.hidden) hiddenDepth--;
			}
			if (tag === 'a') {
				const l = link.pop();
				if (l && hiddenDepth === 0) {
					const shown = out.slice(l.start).join('').trim();
					if (l.href && shown !== l.href && shown !== l.href.replace(/^mailto:/i, ''))
						out.push(` (${l.href})`);
				}
			}
			if (BLOCKS.has(tag) || tag === 'li' || /^h[1-6]$/.test(tag)) newline();
			else if (tag === 'td' || tag === 'th') emit(' ');
			continue;
		}

		const attrs = attributes(m[3] ?? '');
		if (tag === 'br') {
			newline();
			continue;
		}
		if (VOID_TAGS.has(tag) || (m[3] ?? '').trimEnd().endsWith('/')) {
			if (tag === 'hr') newline();
			continue;
		}
		const hidden = DROPPED.has(tag) || hiddenElement(attrs);
		stack.push({ tag, hidden });
		if (hidden) hiddenDepth++;
		if (BLOCKS.has(tag)) newline();
		if (tag === 'li') {
			if (hiddenDepth === 0 && out.length > 0 && !out[out.length - 1]?.endsWith('\n')) newline();
			emit('- ');
		}
		if (tag === 'a') {
			const href = (attrs.get('href') ?? '').trim();
			link.push({ href: /^(?:https?:|mailto:)/i.test(href) ? href : '', start: out.length });
		}
	}
	emit(decodeEntities(html.slice(last)));
	return cleanText(out.join(''));
}

/** Trims a message body to what the Inbox accepts, at a line or word boundary when possible. */
export function limitText(text: string, max: number): string {
	if ([...text].length <= max) return text;
	const cut = [...text].slice(0, max - 1).join('');
	const boundary = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf(' '));
	return `${(boundary > max * 0.8 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}
