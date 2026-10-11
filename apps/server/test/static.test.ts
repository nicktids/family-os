import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy } from '../src/http/static.ts';

describe('SPA content security policy', () => {
	it('allows the shell inline scripts by hash and nothing else inline', () => {
		const inline = 'console.log(1)';
		const csp = contentSecurityPolicy(
			`<head><script src="/x.js"></script><script>${inline}</script></head>`,
		);
		const hash = createHash('sha256').update(inline).digest('base64');
		expect(csp).toContain(`script-src 'self' 'sha256-${hash}'`);
		expect(csp.match(/sha256-/g)).toHaveLength(1);
		expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
		expect(csp).toContain("frame-ancestors 'none'");
		expect(csp).toContain("object-src 'none'");
	});
});
