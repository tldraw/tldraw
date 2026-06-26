import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { T } from '@tldraw/validate'
import { config } from 'dotenv'
import json5 from 'json5'
import regexgen from 'regexgen'
import { exec } from '../../../../internal/scripts/lib/exec'
import { nicelog } from '../../../../internal/scripts/lib/nicelog'
import { csp } from '../src/utils/csp'
import { getMultiplayerServerURL } from './multiplayer-server-url'
import { Config } from './vercel-output-config'

const commonSecurityHeaders = {
	'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'no-referrer-when-downgrade',
	'Content-Security-Policy': csp,
}

// Social/link-unfurling crawlers don't run JavaScript, so they never see the SPA's runtime title
// updates. We route them to the multiplayer worker, which renders the board name into the social
// preview metadata. Rather than maintain a fragile allowlist of crawler user-agents (which always
// misses some unfurler or preview tool), we route any request that *isn't* a real browser
// navigation: browsers send `Sec-Fetch-Mode` on navigations, crawlers and link-preview fetchers
// don't.
//
// Search-engine crawlers are the exception: they also don't send `Sec-Fetch-Mode`, but we want them
// to index the real app, so we exclude them by user-agent. This denylist is small and stable,
// unlike an allowlist of every social platform.
const SEARCH_ENGINE_USER_AGENTS = [
	'Googlebot',
	'Google-InspectionTool',
	'bingbot',
	'DuckDuckBot',
	'YandexBot',
	'Baiduspider',
	'Applebot',
]

// The board routes whose social preview should include the board name, mapped to the URL prefix the
// worker uses to look the name up. Only the bare board route is matched (not sub-routes like
// `/f/:slug/history`).
const SOCIAL_PREVIEW_PREFIXES = ['f', 'p', 's', 'r', 'ro', 'v']

function loadSocialPreviewRoutes(multiplayerServerUrl: string) {
	const searchEngineUserAgent = SEARCH_ENGINE_USER_AGENTS.join('|')
	return SOCIAL_PREVIEW_PREFIXES.map((prefix) => ({
		src: `^/${prefix}/([^/]+)/?$`,
		// Match when the request is neither a browser navigation (no `Sec-Fetch-Mode`) nor a known
		// search engine. `missing` matches when the condition is absent/unmatched.
		missing: [
			{ type: 'header' as const, key: 'sec-fetch-mode' },
			{ type: 'header' as const, key: 'user-agent', value: searchEngineUserAgent },
		],
		dest: `${multiplayerServerUrl}/app/social-preview/${prefix}/$1`,
	}))
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
	await exec('../../../node_modules/.bin/vite', ['build', '--emptyOutDir'])
	await exec('yarn', ['run', '-T', 'sentry-cli', 'sourcemaps', 'inject', 'dist/assets'])
	// Clear output static folder (in case we are running locally and have already built the app once before)
	await exec('rm', ['-rf', '.vercel/output'])
	mkdirSync('.vercel/output', { recursive: true })
	await exec('cp', ['-r', 'dist', '.vercel/output/static'])
	// We serve the .js.map files publicly. The client source is open at tldraw/tldraw, so
	// there's nothing to hide, and serving the maps lets anyone debugging a deployed build get
	// real names and lines in devtools without going through Sentry. Sentry still gets its own
	// copy via the upload step, which reads from dist/assets before this point.

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

	// Includes the .js.map files: they're content-hashed like the chunks they describe, so they're
	// safe to cache immutably, and we now serve them rather than stripping them from the deploy.
	const assetsToCache = assetsList.map((f) => `/assets/${f}`)
	// need to batch these because Vercel's route limit is 4096 characters
	const assetsBatches: string[][] = []
	for (let i = 0; i < assetsToCache.length; i += 50) {
		assetsBatches.push(assetsToCache.slice(i, i + 50))
	}

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
					// route social/link-unfurling crawlers to the worker so board link previews
					// include the board name. must come before the SPA routes below.
					...loadSocialPreviewRoutes(multiplayerServerUrl),
					{
						src: '^/assets/(.*)$',
						// we need `continue: true` here because we also want to apply the headers
						// from the rule below if it matches.
						continue: true,
						headers: {
							'X-Content-Type-Options': 'nosniff',
						},
					},
					// cache static assets immutably. we match by extension to avoid exceeding
					// Vercel's 4096-char route limit (see #8286).
					...assetsBatches.map((batch) => ({
						src: `^${regexgen(batch).source}$`,
						headers: {
							'Cache-Control': 'public, max-age=31536000, immutable',
						},
					})),
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
