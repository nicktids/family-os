import { describe, expect, it } from 'vitest';
import { APP_KINDS, appSettings, KEY_PLACEHOLDER, mcpAddress } from './app-settings.js';

const address = mcpAddress('https://family.example/');

describe('appSettings', () => {
	it('builds the address from the page origin', () => {
		expect(address).toBe('https://family.example/mcp');
	});

	it('gives Claude Code one command with the key as a Bearer header', () => {
		expect(appSettings('claude-code', address, 'famos_abc')).toBe(
			'claude mcp add --transport http familyos https://family.example/mcp --header "Authorization: Bearer famos_abc"',
		);
	});

	it('bridges Claude Desktop through mcp-remote, the key in the environment', () => {
		const config = JSON.parse(appSettings('claude-desktop', address, 'famos_abc'));
		const server = config.mcpServers.familyos;
		expect(server.command).toBe('npx');
		expect(server.args).toEqual([
			'mcp-remote',
			'https://family.example/mcp',
			'--header',
			// biome-ignore lint/suspicious/noTemplateCurlyInString: mcp-remote expands it from env.
			'Authorization:${AUTH_HEADER}',
		]);
		expect(server.env.AUTH_HEADER).toBe('Bearer famos_abc');
	});

	it('gives other apps the address and the header', () => {
		const config = JSON.parse(appSettings('other', address, 'famos_abc'));
		expect(config.mcpServers.familyos).toEqual({
			url: 'https://family.example/mcp',
			headers: { Authorization: 'Bearer famos_abc' },
		});
	});

	it('shows a placeholder once the key is no longer known', () => {
		for (const kind of APP_KINDS)
			expect(appSettings(kind, address, null)).toContain(`Bearer ${KEY_PLACEHOLDER}`);
	});
});
