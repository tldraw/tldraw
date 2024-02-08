import glob from 'fast-glob'
import { mkdirSync, writeFileSync } from 'fs'
import { exec } from '../../../scripts/lib/exec'
import { Config } from './vercel-output-config'

import { config } from 'dotenv'
import { nicelog } from '../../../scripts/lib/nicelog'
config({
	path: './.env.local',
})

nicelog('The multiplayer server is', process.env.MULTIPLAYER_SERVER)

async function build() {
	await exec('vite', ['build', '--emptyOutDir'])
	await exec('yarn', ['run', '-T', 'sentry-cli', 'sourcemaps', 'inject', 'dist/assets'])
	// Clear output static folder (in case we are running locally and have already built the app once before)
	await exec('rm', ['-rf', '.vercel/output'])
	mkdirSync('.vercel/output', { recursive: true })
	await exec('cp', ['-r', 'dist', '.vercel/output/static'])
	await exec('rm', ['-rf', ...glob.sync('.vercel/output/static/**/*.js.map')])
	writeFileSync(
		'.vercel/output/config.json',
		JSON.stringify(
			{
				version: 3,
				routes: [
					// rewrite api calls to the multiplayer server
					{
						src: '^/api(/(.*))?$',
						dest: `${
							process.env.MULTIPLAYER_SERVER?.replace(/^ws/, 'http') ?? 'http://127.0.0.1:8787'
						}$1`,
						check: true,
					},
					// cache static assets immutably
					{
						src: '^/assets/(.*)$',
						headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
					},
					// serve static files
					{
						handle: 'miss',
					},
					// finally handle SPA routing
					{
						check: true,
						src: '.*',
						dest: '/index.html',
					},
				],
				overrides: {},
			} satisfies Config,
			null,
			2
		)
	)
}

build()
