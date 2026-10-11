import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/** Runs the release scripts in a scratch repository whose history starts at one commit. */
describe('release in a fresh repository', () => {
	let repo: string;
	const env = {
		...process.env,
		GIT_CONFIG_GLOBAL: '/dev/null',
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_AUTHOR_NAME: 'Test',
		GIT_AUTHOR_EMAIL: 'test@example.com',
		GIT_COMMITTER_NAME: 'Test',
		GIT_COMMITTER_EMAIL: 'test@example.com',
	};
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd: repo, env, encoding: 'utf8' }).trim();
	const node = (...args: string[]) =>
		execFileSync('node', args, { cwd: repo, env, encoding: 'utf8' });
	const commit = (message: string) => {
		writeFileSync(join(repo, 'change.txt'), message);
		git('add', '.');
		git('commit', '-q', '-m', message);
	};

	beforeEach(() => {
		repo = mkdtempSync(join(tmpdir(), 'famos-release-'));
		for (const dir of ['scripts', 'apps/server', 'apps/web'])
			mkdirSync(join(repo, dir), { recursive: true });
		for (const script of ['release.mjs', 'release-notes.mjs'])
			copyFileSync(join(import.meta.dirname, script), join(repo, 'scripts', script));
		for (const app of ['server', 'web'])
			writeFileSync(
				join(repo, 'apps', app, 'package.json'),
				`{\n\t"name": "${app}",\n\t"version": "0.0.0"\n}\n`,
			);
		git('init', '-q', '-b', 'main');
		git('add', '.');
		git('commit', '-q', '-m', 'Initial commit');
	});
	afterEach(() => rmSync(repo, { recursive: true, force: true }));

	it('tags the first release and says so in its notes', () => {
		const out = node('scripts/release.mjs', '0.1.0');
		expect(git('tag', '--list')).toBe('v0.1.0');
		expect(git('log', '--format=%s')).toBe('chore(release): 0.1.0\nInitial commit');
		expect(JSON.parse(readFileSync(join(repo, 'apps/web/package.json'), 'utf8')).version).toBe(
			'0.1.0',
		);
		expect(out).toContain('First release.');
		expect(out).not.toContain('Maintenance only');

		// What the release workflow runs on the tagged commit.
		const notes = node('scripts/release-notes.mjs', '0.1.0');
		expect(notes).toMatch(/^## 0\.1\.0 \(\d{4}-\d{2}-\d{2}\)\n\nFirst release\.\n$/);
	});

	it('takes the next release from the previous tag', () => {
		node('scripts/release.mjs', '0.1.0');
		commit('feat(lists): shopping categories');
		commit('docs: guide');
		const out = node('scripts/release.mjs', '0.2.0');
		expect(out).toContain('### New\n\n- **lists:** shopping categories\n');
		expect(out).not.toContain('First release.');
		expect(git('tag', '--list')).toBe('v0.1.0\nv0.2.0');
	});
});
