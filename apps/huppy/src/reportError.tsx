import os from 'os'

const discordWebhookUrl = process.env.HUPPY_WEBHOOK_URL

export async function reportError(context: string, error: Error) {
	if (typeof discordWebhookUrl === 'undefined') {
		throw new Error('HUPPY_WEBHOOK_URL not set')
	}

	const body = JSON.stringify({
		content: `[${os.hostname}] ${context}:\n\`\`\`\n${error.stack}\n\`\`\``,
	})
	console.log(context, error.stack)
	if (process.env.NODE_ENV !== 'production') return
	await fetch(discordWebhookUrl, {
		method: 'POST',
		body,
		headers: {
			'Content-Type': 'application/json',
		},
	})
}
