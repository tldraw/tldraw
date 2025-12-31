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
		// paddle
		'https://*.paddle.com',
		// profitwell (loaded by paddle)
		'https://public.profitwell.com',
	],
	'font-src': [`'self'`, `https://fonts.googleapis.com`, `https://fonts.gstatic.com`, 'data:'],
	'frame-src': [
		`'self'`,
		`https:`,
		// paddle checkout
		'https://*.paddle.com',
	],
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
		// paddle
		'https://*.paddle.com',
		// profitwell (loaded by paddle)
		'https://public.profitwell.com',
	],
	'worker-src': [`'self'`, `blob:`],
	'style-src': [
		`'self'`,
		`'unsafe-inline'`,
		`https://fonts.googleapis.com`,
		`https://*.paddle.com`,
	],
	'style-src-elem': [
		`'self'`,
		`'unsafe-inline'`,
		`https://fonts.googleapis.com`,
		// embeds that have styles
		'https://github.githubassets.com',
		// paddle
		'https://*.paddle.com',
	],
	'report-uri': [process.env.SENTRY_CSP_REPORT_URI ?? ``],
}

export const csp = Object.keys(cspDirectives)
	.map((directive) => `${directive} ${cspDirectives[directive].join(' ')}`)
	.join('; ')

export const cspDev = Object.keys(cspDirectives)
	.filter((key) => key !== 'report-uri')
	.map((directive) => `${directive} ${cspDirectives[directive].join(' ')}`)
	.join('; ')
