import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
// import { spawn } from 'node:child_process';
import fs from 'fs';

export default defineConfig({
	server: {
		port: 60000,
		https: {
			key: fs.readFileSync('./ssl/key.pem'),
			cert: fs.readFileSync('./ssl/cert.pem')
		}
	},
	worker: { format: 'es' },
	plugins: [
		tailwindcss(),
		sveltekit(),
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		livestoreDevtoolsPlugin({ schemaPath: './src/lib/livestore/schema.ts' }),
		devtoolsJson()

		// {
		// 	name: 'wrangler-dev',
		// 	configureServer() {
		// 		const wrangler = spawn('bunx', ['wrangler', 'dev', '--port', '8787'], {
		// 			stdio: ['ignore', 'inherit', 'inherit']
		// 		});
		// 		process.on('exit', () => wrangler.kill());
		// 	}
		// }
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
