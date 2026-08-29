import { defineConfig } from 'vitest/config';
import { transformWithOxc } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	plugins: [
		{
			name: 'next-jsx-page-tests',
			enforce: 'pre',
			transform(source, id) {
				if (/\/src\/app\/.*\.js$/.test(id.replaceAll('\\', '/'))) {
					return transformWithOxc(source, id, { lang: 'jsx', jsx: { runtime: 'automatic' } });
				}
			},
		},
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	test: {
		environment: 'node',
		include: ['tests/**/*.test.js'],
	},
});
