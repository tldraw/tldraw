interface Env {
	DISCORD_HEALTH_WEBHOOK_URL: string | undefined
	// it needs to be passed in because it's effectively a secret, unless we want everyone to be able
	// to stress us out with spurious discord alerts
	HEALTH_WORKER_UPDOWN_WEBHOOK_PATH: string | undefined
}

// docs: https://updown.io/api#webhooks
type UpdownWebhook = Array<{
	event: string
	time: string
	description: string
	// there are more fields that depend on the type of the event,
	// but we don't really need them
}>

// docs: https://birdie0.github.io/discord-webhooks-guide/index.html
type DiscordWebhook = {
	username: string
	content: string
}

function updownToDiscord(updown: UpdownWebhook): DiscordWebhook[] {
	return updown.map(({ description }) => ({
		username: 'Updown',
		content: description,
	}))
}

async function sendDiscordWebhook(url: string, discord: DiscordWebhook): Promise<Response> {
	return fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(discord),
	})
}

async function handleUpdown(request: Request, discordUrl: string): Promise<Response> {
	const updown = (await request.json()) as UpdownWebhook
	const discord = updownToDiscord(updown)

	let status = 200
	for (const wh of discord) {
		const discordResult = await sendDiscordWebhook(discordUrl, wh)

		if (!discordResult.ok) {
			console.error(`Discord error ${discordResult.status}: ${discordResult.statusText}`)
			status = discordResult.status
		}
	}

	return new Response(null, { status })
}

const encoder = new TextEncoder()

// per https://developers.cloudflare.com/workers/examples/basic-auth/
function timingSafeEqual(a: string, b: string): boolean {
	const aBytes = encoder.encode(a)
	const bBytes = encoder.encode(b)

	if (aBytes.byteLength !== bBytes.byteLength) {
		// Strings must be the same length in order to compare
		// with crypto.subtle.timingSafeEqual
		return false
	}

	// timinsSafeEqual is a non-standard Cloudflare extension to the crypto API, see
	// https://developers.cloudflare.com/workers/runtime-apis/web-crypto/#timingsafeequal
	// @ts-ignore
	return crypto.subtle.timingSafeEqual(aBytes, bBytes)
}

const handler: ExportedHandler<Env> = {
	async fetch(request: Request, env: Env): Promise<Response> {
		const discordUrl = env.DISCORD_HEALTH_WEBHOOK_URL
		if (!discordUrl) {
			console.error('missing DISCORD_HEALTH_WEBHOOK_URL')
			return new Response('Internal error', { status: 500 })
		}

		const updownWebhookPath = env.HEALTH_WORKER_UPDOWN_WEBHOOK_PATH
		if (!updownWebhookPath) {
			console.error('missing HEALTH_WORKER_UPDOWN_WEBHOOK_PATH')
			return new Response('Internal error', { status: 500 })
		}

		const url = new URL(request.url)

		if (timingSafeEqual(url.pathname, updownWebhookPath)) {
			return handleUpdown(request, discordUrl)
		}

		return new Response('Not Found', { status: 404 })
	},
}

export default handler
