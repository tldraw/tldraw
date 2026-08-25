export const cspDirectives: { [key: string]: string[] } = {
	'default-src': [`'self'`],
	'connect-src': [
		`'self'`,
		`ws:`,
		`wss:`,
		'blob:',
		'data:',
		'http://localhost:8788',
		'http://localhost:8789',
		`https://*.tldraw.xyz`,
		`https://cdn.tldraw.com`,
		`https://*.tldraw.workers.dev`,
		`https://*.ingest.sentry.io`,
		`https://*.ingest.us.sentry.io`,
		'https://*.analytics.google.com',
		'https://analytics.google.com',
		'https://www.google-analytics.com',
		'https://*.googletagmanager.com',
		'https://www.googletagmanager.com',
		// for thumbnail server
		'http://localhost:5002',
		'https://*.clerk.accounts.dev',
		'https://clerk.tldraw.com',
		'https://clerk.staging.tldraw.com',
		'https://clerk-telemetry.com',
		// zero
		'https://*.zero.tldraw.com',
		'https://zero.tldraw.com',
		'http://localhost:4848',
		'https://analytics.tldraw.com',
		'https://consent.tldraw.xyz',
		'https://stats.g.doubleclick.net',
		'https://*.google-analytics.com',
		'https://api.reo.dev',
		'https://fonts.googleapis.com',
		// asset uploads/serving
		'https://tldrawusercontent.com',
		'https://*.tldrawusercontent.com',
	],
	'font-src': [`'self'`, `https://fonts.googleapis.com`, `https://fonts.gstatic.com`, 'data:'],
	'frame-src': [`'self'`, `https:`],
	'img-src': [`'self'`, `http:`, `https:`, `data:`, `blob:`],
	'media-src': [`'self'`, `http:`, `https:`, `data:`, `blob:`],
	'script-src': [
		`'self'`,
		'https://challenges.cloudflare.com',
		'https://*.clerk.accounts.dev',
		'https://clerk.tldraw.com',
		'https://clerk.staging.tldraw.com',
		// embeds that have scripts
		'https://gist.github.com',
		'https://www.googletagmanager.com',
		'https://*.googletagmanager.com',
		'https://www.google-analytics.com',
		'https://*.google-analytics.com',
		'https://analytics.tldraw.com',
		'https://static.reo.dev',
	],
	'worker-src': [`'self'`, `blob:`],
	'style-src': [`'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com`],
	'style-src-elem': [
		`'self'`,
		`'unsafe-inline'`,
		`https://fonts.googleapis.com`,
		// embeds that have styles
		'https://github.githubassets.com',
	],
	'report-uri': [process.env.SENTRY_CSP_REPORT_URI ?? ``],
}

function serializeCsp(directives: { [key: string]: string[] }) {
	return Object.keys(directives)
		.map((directive) => `${directive} ${directives[directive].join(' ')}`)
		.join('; ')
}

export const csp = serializeCsp(cspDirectives)

// The thumbnail render page's CSP: the app policy plus inline script. The sync-worker pushes the
// board snapshot into this page via Browser Run's addScriptTag, which injects an INLINE script —
// under the app policy's script-src the browser silently blocks it and the page falls back to
// fetching a snapshot with the render token, which is exactly the round trip push exists to remove.
// The relaxation is confined to this one machine-facing route: the page renders worker-authored
// content for a headless capture, and a human who wanders in gets an inert "missing token" page —
// there is no user session or credential on this origin path for an inline script to reach.
export const thumbnailRenderCsp = serializeCsp({
	...cspDirectives,
	'script-src': [...cspDirectives['script-src'], `'unsafe-inline'`],
})

export const cspDev = Object.keys(cspDirectives)
	.filter((key) => key !== 'report-uri')
	.map((directive) => {
		const values = cspDirectives[directive]
		// We allow data: urls for frame-src to allow debugging SVG embeds in dev.
		if (directive === 'frame-src') return `${directive} ${[...values, 'data:'].join(' ')}`
		return `${directive} ${values.join(' ')}`
	})
	.join('; ')
