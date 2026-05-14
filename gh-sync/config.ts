/* eslint-disable no-console */
// Shared environment-derived config for gh-sync. Loaded once at process start.

function required(name: string): string {
	const v = process.env[name]
	if (!v) {
		console.error(`Missing required env var: ${name}`)
		process.exit(1)
	}
	return v
}

export const config = {
	tldrApiBase: process.env.TLDR_API_BASE ?? 'https://api.tldraw.com',
	tldrApiToken: required('TLDR_API_TOKEN'),
	tldrFileSlug: required('TLDR_FILE_SLUG'),
	tldrPublicUrl: process.env.TLDR_PUBLIC_URL ?? '',
	port: Number(process.env.PORT ?? 9090),
}

export const tldrWebhookUrl = config.tldrPublicUrl
	? `${config.tldrPublicUrl}/tldraw-webhook`
	: ''
