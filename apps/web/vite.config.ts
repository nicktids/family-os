import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const api = process.env.FAMOS_API ?? 'http://localhost:3000';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit({ adapter: adapter({ fallback: 'index.html' }) })],
	server: {
		proxy: {
			'/api': { target: api, changeOrigin: false, ws: true },
			'/health': api,
		},
	},
});
