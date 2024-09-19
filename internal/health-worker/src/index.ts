import { DiscordPayload, updownToDiscord } from './discord'
import { Event as UpdownEvent } from './updown_types'

interface Env {
	DISCORD_HEALTH_WEBHOOK_URL: string | undefined
	// it needs to be passed in because it's effectively a secret, unless we want everyone to be able
	// to stress us out with spurious discord alerts
	HEALTH_WORKER_UPDOWN_WEBHOOK_PATH: string | undefined
}

async function sendDiscordWebhook(url: string, discord: DiscordPayload): Promise<Response> {
	return fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(discord),
	})
}

async function handleUpdown(request: Request, discordUrl: string): Promise<Response> {
	const updownEvents = (await request.json()) as Array<UpdownEvent>

	let status = 200
	for (const e of updownEvents) {
		const discordPayload = updownToDiscord(e)
		if (!discordPayload) {
			continue
		}
		const discordResult = await sendDiscordWebhook(discordUrl, discordPayload)

		if (!discordResult.ok) {
			console.error(`Discord error ${discordResult.status}: ${discordResult.statusText}`)
			status = discordResult.status
			break
		}
	}

	return new Response(null, { status })
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

		// timing safety COULD be an issue, but it seems that in practice it isn't:
		// https://github.com/scriptin/node-timing-attack
		// my own testing confirms those observations
		if (url.pathname === updownWebhookPath) {
			return handleUpdown(request, discordUrl)
		}

		return new Response('Not Found', { status: 404 })
	},
}

export default handler
