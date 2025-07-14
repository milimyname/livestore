import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
// import { spawn } from 'node:child_process';

const isProdBuild = process.env.NODE_ENV === 'production';

export default defineConfig({
	server: {
		host: 'localhost',
		port: 60000
	},
	worker: isProdBuild ? { format: 'es' } : undefined,
	optimizeDeps: {
		// TODO remove once fixed https://github.com/vitejs/vite/issues/8427
		exclude: ['@livestore/wa-sqlite']
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		livestoreDevtoolsPlugin({ schemaPath: './src/lib/livestore/schema.ts' }),
		// devtoolsJson()

	
	],

	test: {
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
