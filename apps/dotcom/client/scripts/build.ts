import { T } from '@tldraw/validate'
import { config } from 'dotenv'
import glob from 'fast-glob'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import json5 from 'json5'
import regexgen from 'regexgen'
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
// It uses a vitest snapshot file because deriving the set of routes from our
// react-router config works fine in our test environment, but is tricky to get running in this
// build script environment for various reasons (no global React, tsx being weird about decorators, etc).
function loadSpaRoutes() {
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
	const assetsList = readdirSync('dist/assets')
	const fontsToPreload = [
		'Shantell_Sans-Informal_Regular',
		'IBMPlexSerif-Medium',
		'IBMPlexSans-Medium',
		'IBMPlexMono-Medium',
	]
	const fontPreloads = fontsToPreload
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

	const spritePreload = `<link
		rel="preload"
		href="/assets/${assetsList.find((a) => a.startsWith('0_merged-'))}"
		as="image"
		type="image/svg+xml"
		crossorigin="anonymous"
	/>`

	const indexHtml = readFileSync('.vercel/output/static/index.html', 'utf8')
	const newIndex = indexHtml
		.replace('<!-- $PRELOADED_FONTS -->', fontPreloads)
		.replace('<!-- $PRELOADED_SPRITES -->', spritePreload)

	writeFileSync('.vercel/output/static/index.html', newIndex)

	const multiplayerServerUrl = getMultiplayerServerURL() ?? 'http://localhost:8787'
	const assetsToCache = assetsList.filter((f) => !f.endsWith('.js.map')).map((f) => `/assets/${f}`)
	const assetsToCacheRegex = `^${regexgen(assetsToCache).source}$`

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
					{
						src: '^/assets/(.*)$',
						// we need `continue: true` here because we also want to apply the headers
						// from the rule below if it matches.
						continue: true,
						headers: {
							'X-Content-Type-Options': 'nosniff',
						},
					},
					// cache static assets immutably. we use a regex here to match all assets we
					// know exist so we don't apply caching headers to 404 pages.
					{
						src: assetsToCacheRegex,
						headers: {
							'Cache-Control': 'public, max-age=31536000, immutable',
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
