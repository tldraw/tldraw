import glob from 'fast-glob'
import { mkdirSync, writeFileSync } from 'fs'
import { exec } from '../../../scripts/lib/exec'
import { Config } from './vercel-output-config'

import { config } from 'dotenv'
import json5 from 'json5'
import { nicelog } from '../../../scripts/lib/nicelog'

import { T } from '@tldraw/validate'

function loadSpaRoutes() {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const routesJson = require('../src/__snapshots__/routes.test.ts.snap')['the_routes 1']
	const routes = T.arrayOf(
		T.object({
			reactRouterPattern: T.string,
			vercelRoutingPattern: T.string,
		})
	).validate(json5.parse(routesJson))
	return routes.map((route) => ({
		check: true,
		src: route.vercelRoutingPattern,
		dest: '/index.html',
	}))
}

config({
	path: './.env.local',
})

nicelog('The multiplayer server is', process.env.MULTIPLAYER_SERVER)

async function build() {
	// make sure we have the latest routes
	await exec('yarn', ['test'])
	const spaRoutes = loadSpaRoutes()
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
					...spaRoutes,
					// react router will handle drawing the 404 page
					{
						check: true,
						src: '.*',
						dest: '/index.html',
						status: 404,
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
