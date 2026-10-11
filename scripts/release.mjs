// Prepares a release locally: sets the version, commits and tags. Pushing is left to a person.
//   node scripts/release.mjs <x.y.z>   (pnpm release <x.y.z>)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

/** The product version lives in these manifests (the server reports it, the web shows it). */
const MANIFESTS = ['apps/server/package.json', 'apps/web/package.json'];
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

const version = process.argv[2];
if (!version || !SEMVER.test(version)) {
	console.error('Usage: pnpm release <x.y.z> (SemVer, e.g. 0.2.0 or 1.0.0-rc.1)');
	process.exit(2);
}
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
if (git('status', '--porcelain')) {
	console.error('The working tree has changes; commit or stash them first.');
	process.exit(1);
}
if (git('tag', '--list', `v${version}`)) {
	console.error(`Tag v${version} already exists.`);
	process.exit(1);
}

for (const file of MANIFESTS) {
	const text = readFileSync(file, 'utf8');
	writeFileSync(file, text.replace(/"version": "[^"]+"/, `"version": "${version}"`));
}
git('add', ...MANIFESTS);
git('commit', '-m', `chore(release): ${version}`);
git('tag', '-a', `v${version}`, '-m', `FamilyOS ${version}`);
console.log(`Tagged v${version}. Check the notes, then push:\n`);
console.log(execFileSync('node', ['scripts/release-notes.mjs', version], { encoding: 'utf8' }));
console.log('  git push origin main --follow-tags');
