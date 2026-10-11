// Fails if a workspace package's package.json is not copied in docker/Dockerfile's dependency
// layer (the image build would break or install an incomplete workspace). Run by `pnpm lint`.
import { readdirSync, readFileSync } from 'node:fs';

const dockerfile = readFileSync('docker/Dockerfile', 'utf8');
const missing = [];
for (const group of ['apps', 'packages', 'extensions']) {
	let dirs = [];
	try {
		dirs = readdirSync(group, { withFileTypes: true }).filter((d) => d.isDirectory());
	} catch {
		continue;
	}
	for (const dir of dirs) {
		const manifest = `${group}/${dir.name}/package.json`;
		try {
			readFileSync(manifest);
		} catch {
			continue;
		}
		if (!dockerfile.includes(`COPY ${manifest} ${group}/${dir.name}/`)) missing.push(manifest);
	}
}
// Bundled language packs must ship in the image.
if (!/COPY --from=build \/repo\/languages \.\/languages/.test(dockerfile)) {
	missing.push('languages/ (COPY --from=build /repo/languages ./languages)');
}
// Bundled theme packs must ship in the image.
if (!/COPY --from=build \/repo\/themes \.\/themes/.test(dockerfile)) {
	missing.push('themes/ (COPY --from=build /repo/themes ./themes)');
}
if (missing.length > 0) {
	console.error(`docker/Dockerfile does not copy: ${missing.join(', ')}`);
	process.exit(1);
}
console.log(
	'✔ Dockerfile copies every workspace package manifest, the language packs and the theme packs',
);
