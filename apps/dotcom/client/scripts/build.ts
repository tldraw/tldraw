import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import {
	FILE_PREFIX,
	PUBLISH_PREFIX,
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_PREFIX,
	SNAPSHOT_PREFIX,
	SOCIAL_PREVIEW_BYPASS_PARAM,
} from '@tldraw/dotcom-shared'
import { T } from '@tldraw/validate'
import { config } from 'dotenv'
import json5 from 'json5'
import regexgen from 'regexgen'
import { exec } from '../../../../internal/scripts/lib/exec'
import { nicelog } from '../../../../internal/scripts/lib/nicelog'
import { csp } from '../src/utils/csp'
import { reportBundleSize } from './measure-bundle-size'
import { getMultiplayerServerURL } from './multiplayer-server-url'
import { Config } from './vercel-output-config'

const commonSecurityHeaders = {
	'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'no-referrer-when-downgrade',
	'Content-Security-Policy': csp,
}

// RFC 8288 links from the homepage to the discovery documents an agent would otherwise have to guess
// at. Only the homepage carries these: an agent arriving anywhere else on tldraw.com is already
// looking at a board, and repeating ~200 bytes on every SPA route and asset buys nothing.
//
// `api-catalog` (RFC 9727), `ai-catalog` and `service-doc` are all registered relations, and the
// specific one matters: the AI Catalog spec has agents check for `rel="ai-catalog"` first and only
// *optionally* fall back to the well-known path, so a catalog advertised under any other relation is
// one a conformant client never sees.
const agentDiscoveryLinkHeader = [
	'</.well-known/api-catalog>; rel="api-catalog"',
	'</.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/ai-catalog+json"',
	'<https://tldraw.dev>; rel="service-doc"; type="text/html"',
].join(', ')

// Regex fragments matched against the user-agent of requests to board URLs. Matching requests are
// routed to the multiplayer worker, which renders the board name into the social preview metadata
// for link-unfurling crawlers that don't run JavaScript and so never see the SPA's runtime title
// updates.
//
// The generic `[Bb]ot` token catches the long tail of unfurlers (Twitterbot, Discordbot, Slackbot,
// TelegramBot, LinkedInBot, redditbot, ...) including tldraw's own link-unfurl service
// (`tldraw-bot/x.y.z`), so pasting a board link into a tldraw canvas shows the board name in the
// bookmark. The named entries are unfurlers that don't say "bot". LINE and KakaoTalk are covered
// too: their unfurlers identify as `facebookexternalhit`.
//
// Search-engine crawlers (Googlebot, bingbot) also match the generic token, but robots.txt already
// disallows all board routes, so compliant search engines never request these URLs; a bot that
// ignores robots.txt gets the preview stub, which is fine. Real people whose browser carries a
// matching token — in-app browsers (WhatsApp, Pinterest) or the odd device name containing "bot" —
// are bounced back to the app by the stub via the bypass param.
const SOCIAL_CRAWLER_USER_AGENTS = [
	'[Bb]ot',
	'facebookexternalhit',
	'Slack-ImgProxy',
	'WhatsApp',
	'Pinterest',
	'Embedly',
	'Iframely',
	'vkShare',
	'W3C_Validator',
	'SkypeUriPreview',
	'Mastodon',
	'Bluesky',
]

// The board routes whose social preview should include the board name. Only the bare board route is
// matched (not sub-routes like `/f/:slug/history`).
const SOCIAL_PREVIEW_PREFIXES = [
	FILE_PREFIX,
	PUBLISH_PREFIX,
	SNAPSHOT_PREFIX,
	ROOM_PREFIX,
	READ_ONLY_PREFIX,
	READ_ONLY_LEGACY_PREFIX,
]

const userAgent = `.*(?:${SOCIAL_CRAWLER_USER_AGENTS.join('|')}).*`

function socialPreviewRoute(multiplayerServerUrl: string) {
	// Vercel matches `has.value` as `^value$`, so a bare `a|b|c` join anchors the first token to the
	// start of the user-agent and the last token to the end. Wrap the alternation so every token is
	// a substring match.
	return {
		src: `^/(${SOCIAL_PREVIEW_PREFIXES.join('|')})/([^/]+)/?$`,
		has: [{ type: 'header' as const, key: 'user-agent', value: userAgent }],
		// some in-app browsers used by real people carry a crawler token in their user-agent
		// (WhatsApp, Pinterest). the stub page bounces those visitors back to the board with this
		// param set, which makes this route not match so they fall through to the real app.
		missing: [{ type: 'query' as const, key: SOCIAL_PREVIEW_BYPASS_PARAM }],
		dest: `${multiplayerServerUrl}/app/social-preview/$1/$2`,
	}
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
					// redirect /offline to the offline version of tldraw
					{
						src: '^/offline/?$',
						status: 307,
						headers: { Location: 'https://offline.tldraw.com/' },
					},
					// rewrite api calls to the multiplayer server
					{
						src: '^/api(/(.*))?$',
						dest: `${multiplayerServerUrl}$1`,
						check: true,
					},
					// MCP OAuth discovery (RFC 9728) lives at the origin, outside /api, so the
					// rewrite above misses it. staging and production reach the worker through
					// Cloudflare zone routes for this prefix (see the sync worker's wrangler.toml);
					// previews have no zone routes, so this rewrite is their only path to it. the
					// path is passed through unstripped — the worker registers the full well-known
					// path, /api included.
					{
						src: '^/\\.well-known/oauth-protected-resource(/(.*))?$',
						dest: `${multiplayerServerUrl}/.well-known/oauth-protected-resource$1`,
						check: true,
					},
					// The MCP Server Card's `.well-known` alias, for the same reason: the canonical
					// card lives at /api/app/mcp/server-card, but scanners probe this path, and it
					// sits outside the /api rewrite above.
					{
						src: '^/\\.well-known/mcp/(.*)$',
						dest: `${multiplayerServerUrl}/.well-known/mcp/$1`,
						check: true,
					},
					// route social/link-unfurling crawlers to the worker so board link previews
					// include the board name. must come before the SPA routes below. set
					// SOCIAL_PREVIEW_DISABLED=true to turn this off without a code change.
					...(process.env.SOCIAL_PREVIEW_DISABLED === 'true'
						? []
						: [socialPreviewRoute(multiplayerServerUrl)]),
					{
						src: '^/assets/(.*)$',
						// we need `continue: true` here because we also want to apply the headers
						// from the rule below if it matches.
						continue: true,
						headers: {
							'X-Content-Type-Options': 'nosniff',
						},
					},
					// RFC 9727 requires the catalog to answer a HEAD request with an api-catalog Link
					// header, so that a client can find where the catalog really lives without
					// fetching it. Ours is at the well-known path, so the link points at itself; a
					// publisher serving the document elsewhere would point there instead.
					//
					// Vercel matches routes by path, not method, so this lands on GET too. Harmless,
					// and the RFC's own example shows the relation on a GET response.
					//
					// The catalogs are also stated to be readable cross-origin — a browser-context
					// agent is a normal consumer, and ARD requires it. Vercel already serves static
					// files with `Access-Control-Allow-Origin: *`, but that is a platform default
					// rather than something the spec lets us assume.
					{
						src: '^/\\.well-known/api-catalog$',
						continue: true,
						headers: {
							Link: '</.well-known/api-catalog>; rel="api-catalog"',
							'Access-Control-Allow-Origin': '*',
						},
					},
					{
						src: '^/\\.well-known/ai-catalog\\.json$',
						continue: true,
						headers: { 'Access-Control-Allow-Origin': '*' },
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
						headers: { ...commonSecurityHeaders, Link: agentDiscoveryLinkHeader },
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
				// Vercel types static files from their extension, which has nothing useful to say
				// about `api-catalog` (extensionless, as RFC 9727 requires) and would serve
				// `auth.md` as a download rather than something an agent reads.
				overrides: {
					'.well-known/api-catalog': {
						contentType:
							'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
					},
					'.well-known/ai-catalog.json': { contentType: 'application/ai-catalog+json' },
					'auth.md': { contentType: 'text/markdown; charset=utf-8' },
				},
			} satisfies Config,
			null,
			2
		)
	)

	await reportBundleSize('.vercel/output/static')
}

build()
