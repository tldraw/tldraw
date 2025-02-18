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
		// for thumbnail server
		'http://localhost:5002',
		'https://*.clerk.accounts.dev',
		'https://clerk.tldraw.com',
		'https://clerk.staging.tldraw.com',
		// zero
		'http://localhost:4848',
	],
	'font-src': [`'self'`, `https://fonts.googleapis.com`, `https://fonts.gstatic.com`, 'data:'],
	'frame-src': [`https:`],
	'img-src': [`'self'`, `http:`, `https:`, `data:`, `blob:`],
	'media-src': [`'self'`, `http:`, `https:`, `data:`, `blob:`],
	'script-src': [
		// need wasm for zero
		`'unsafe-eval'`,
		`'self'`,
		'https://challenges.cloudflare.com',
		'https://*.clerk.accounts.dev',
		'https://clerk.tldraw.com',
		'https://clerk.staging.tldraw.com',
		// embeds that have scripts
		'https://gist.github.com',
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
