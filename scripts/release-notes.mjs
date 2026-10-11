// Release notes from Conventional Commits (no release library).
//   node scripts/release-notes.mjs <version> [from-ref] [to-ref]
// Without from-ref, the previous version tag is used; when there is none, every commit up to
// to-ref counts and the notes say it is the first release.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SECTIONS = [
	['breaking', 'Breaking changes'],
	['feat', 'New'],
	['fix', 'Fixed'],
	['perf', 'Faster'],
	['security', 'Security'],
];

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<subject>.+)$/;

/** Parses one commit; returns null for messages that are not Conventional Commits. */
export function parseCommit(message) {
	const [header = '', ...rest] = message.trim().split('\n');
	const match = HEADER.exec(header.trim());
	if (!match?.groups) return null;
	const body = rest.join('\n');
	const breakingNote = /^BREAKING[ -]CHANGE: (.+)$/m.exec(body)?.[1];
	return {
		type: match.groups.type,
		scope: match.groups.scope ?? null,
		subject: match.groups.subject,
		breaking: Boolean(match.groups.bang) || breakingNote !== undefined,
		breakingNote: breakingNote ?? null,
	};
}

/**
 * Groups user-visible commits into Markdown; docs, tests and chores are left out. `first` marks
 * the first release, which has no earlier version to compare with.
 */
export function renderNotes(version, messages, date = new Date(), { first = false } = {}) {
	const commits = messages.map(parseCommit).filter(Boolean);
	const groups = new Map(SECTIONS.map(([key]) => [key, []]));
	for (const c of commits) {
		const security = c.type === 'fix' && c.scope === 'security';
		const line = `- ${c.scope && !security ? `**${c.scope}:** ` : ''}${c.subject}`;
		if (c.breaking) {
			groups.get('breaking').push(c.breakingNote ? `${line} — ${c.breakingNote}` : line);
			continue;
		}
		// Security fixes get their own section so people know to update.
		const key = security ? 'security' : c.type;
		groups.get(key)?.push(line);
	}
	const out = [`## ${version} (${date.toISOString().slice(0, 10)})`, ''];
	if (first) out.push('First release.', '');
	const intro = out.length;
	for (const [key, title] of SECTIONS) {
		const lines = groups.get(key);
		if (lines.length === 0) continue;
		out.push(`### ${title}`, '', ...lines, '');
	}
	if (!first && out.length === intro) out.push('Maintenance only: no user-visible changes.', '');
	return out.join('\n');
}

function git(...args) {
	return execFileSync('git', args, {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
	}).trim();
}

function previousTag(to) {
	try {
		return git('describe', '--tags', '--abbrev=0', '--match', 'v*', `${to}^`);
	} catch {
		return null;
	}
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const [version, fromArg, to = 'HEAD'] = process.argv.slice(2);
	if (!version) {
		console.error('Usage: node scripts/release-notes.mjs <version> [from-ref] [to-ref]');
		process.exit(2);
	}
	const from = fromArg ?? previousTag(to);
	const range = from ? `${from}..${to}` : to;
	const messages = git('log', '--format=%B%x1e', range)
		.split('\x1e')
		.map((m) => m.trim())
		.filter(Boolean);
	process.stdout.write(renderNotes(version, messages, new Date(), { first: !from }));
}
