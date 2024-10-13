export const cspDirectives: { [key: string]: string[] } = {
	'default-src': [`'self'`],
	'connect-src': [
		`'self'`,
		`ws:`,
		`wss:`,
		'blob:',
		'data:',
		'http://localhost:8788',
		`https://assets.tldraw.xyz`,
		`https://*.tldraw.workers.dev`,
		`https://*.ingest.sentry.io`,
		// for thumbnail server
		'http://localhost:5002',
		'https://*.clerk.accounts.dev',
		'https://clerk.tldraw.com',
		'https://clerk.staging.tldraw.com',
	],
	'font-src': [`'self'`, `https://fonts.googleapis.com`, `https://fonts.gstatic.com`, 'data:'],
	'frame-src': [`https:`],
	'img-src': [`'self'`, `http:`, `https:`, `data:`, `blob:`],
	'media-src': [`'self'`, `http:`, `https:`, `data:`, `blob:`],
	'script-src': [
		`'self'`,
		'https://challenges.cloudflare.com',
		'https://*.clerk.accounts.dev',
		'https://clerk.tldraw.com',
		'https://clerk.staging.tldraw.com',
	],
	'worker-src': [`'self'`, `blob:`],
	'style-src': [`'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com`],
	'style-src-elem': [`'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com`],
	'report-uri': [process.env.SENTRY_CSP_REPORT_URI ?? ``],
}

export const csp = Object.keys(cspDirectives)
	.map((directive) => `${directive} ${cspDirectives[directive].join(' ')}`)
	.join('; ')

export const cspDev = Object.keys(cspDirectives)
	.filter((key) => key !== 'report-uri')
	.map((directive) => `${directive} ${cspDirectives[directive].join(' ')}`)
	.join('; ')
