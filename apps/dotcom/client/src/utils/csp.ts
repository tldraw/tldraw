export const cspDirectives: { [key: string]: string[] } = {
	'default-src': [`'self'`],
	'connect-src': [
		`'self'`,
		`ws:`,
		`wss:`,
		'blob:',
		'data:',
		'http://localhost:8788',
		`https://*.tldraw.xyz`,
		`https://cdn.tldraw.com`,
		`https://*.tldraw.workers.dev`,
		`https://*.ingest.sentry.io`,
		`https://*.ingest.us.sentry.io`,
		'https://*.analytics.google.com',
		'https://www.google-analytics.com',
		'https://*.googletagmanager.com',
		'https://www.googletagmanager.com',
		// for thumbnail server
		'http://localhost:5002',
		'https://*.clerk.accounts.dev',
		'https://clerk.tldraw.com',
		'https://clerk.staging.tldraw.com',
		// zero
		'https://*.zero.tldraw.com',
		'https://zero.tldraw.com',
		'http://localhost:4848',
		'https://analytics.tldraw.com',
		'https://stats.g.doubleclick.net',
		'https://*.google-analytics.com',
		'https://api.reo.dev',
		'https://fonts.googleapis.com',
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

export const csp = Object.keys(cspDirectives)
	.map((directive) => `${directive} ${cspDirectives[directive].join(' ')}`)
	.join('; ')

export const cspDev = Object.keys(cspDirectives)
	.filter((key) => key !== 'report-uri')
	.map((directive) => `${directive} ${cspDirectives[directive].join(' ')}`)
	.join('; ')
