import { T } from '@tldraw/validate'
import { config } from 'dotenv'
import glob from 'fast-glob'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import json5 from 'json5'
import { exec } from '../../../../internal/scripts/lib/exec'
import { nicelog } from '../../../../internal/scripts/lib/nicelog'
import { csp } from '../src/utils/csp'
import { getMultiplayerServerURL } from '../vite.config'
import { Config } from './vercel-output-config'

const commonSecurityHeaders = {
	'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'no-referrer-when-downgrade',
	'Content-Security-Policy': csp,
}

// We load the list of routes that should be forwarded to our SPA's index.html here.
// It uses a jest snapshot file because deriving the set of routes from our
// react-router config works fine in our test environment, but is tricky to get running in this
// build script environment for various reasons (no global React, tsx being weird about decorators, etc).
function loadSpaRoutes() {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const routesJson = require('../src/__snapshots__/routes.test.tsx.snap')['the_routes 1']
	const routes = T.arrayOf(
		T.object({
			reactRouterPattern: T.string,
			vercelRouterPattern: T.string,
		})
	).validate(json5.parse(routesJson))
	return routes.map((route) => ({
		check: true,
		src: route.vercelRouterPattern,
		dest: '/index.html',
		headers: commonSecurityHeaders,
	}))
}

config({
	path: './.env.local',
})

nicelog('The multiplayer server is', process.env.MULTIPLAYER_SERVER)

async function build() {
	// make sure we have the latest routes
	await exec('yarn', ['test', 'src/routes.test.tsx'])
	const spaRoutes = loadSpaRoutes()
	await exec('vite', ['build', '--emptyOutDir'])
	await exec('yarn', ['run', '-T', 'sentry-cli', 'sourcemaps', 'inject', 'dist/assets'])
	// Clear output static folder (in case we are running locally and have already built the app once before)
	await exec('rm', ['-rf', '.vercel/output'])
	mkdirSync('.vercel/output', { recursive: true })
	await exec('cp', ['-r', 'dist', '.vercel/output/static'])
	await exec('rm', ['-rf', ...glob.sync('.vercel/output/static/**/*.js.map')])

	// Add fonts to preload into index.html
	const assetsList = (await exec('ls', ['-1', 'dist/assets'])).split('\n').filter(Boolean)
	const fontsToPreload = [
		'Shantell_Sans-Tldrawish',
		'IBMPlexSerif-Medium',
		'IBMPlexSans-Medium',
		'IBMPlexMono-Medium',
	]
	const indexHtml = await readFileSync('.vercel/output/static/index.html', 'utf8')
	await writeFileSync(
		'.vercel/output/static/index.html',
		indexHtml.replace(
			'<!-- $PRELOADED_FONTS -->',
			fontsToPreload
				.map(
					(font) => `<link
		rel="preload"
		href="/assets/${assetsList.find((a) => a.startsWith(font))}"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>`
				)
				.join('\n')
		)
	)

	const multiplayerServerUrl = getMultiplayerServerURL() ?? 'http://localhost:8787'

	writeFileSync(
		'.vercel/output/config.json',
		JSON.stringify(
			{
				version: 3,
				routes: [
					// rewrite api calls to the multiplayer server
					{
						src: '^/api(/(.*))?$',
						dest: `${multiplayerServerUrl}$1`,
						check: true,
					},
					// cache static assets immutably
					{
						src: '^/assets/(.*)$',
						headers: {
							'Cache-Control': 'public, max-age=31536000, immutable',
							'X-Content-Type-Options': 'nosniff',
						},
					},
					// server up index.html specifically because we want to include
					// security headers. otherwise, it goes to the handle: 'miss'
					// part below (and _not_ to the spaRoutes as maybe expected!)
					{
						check: true,
						src: '/',
						dest: '/index.html',
						headers: commonSecurityHeaders,
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
						headers: commonSecurityHeaders,
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
