import os from 'os'

const discordWebhookUrl =
	'https://discord.com/api/webhooks/1102993417744683088/Zzp9eokOuJiANzEAa-b3GLGcuLPkdYRatWsj6WeMmKicoI4Q9VscmjzQTTG_9THbWZcy'

export async function reportError(context: string, error: Error) {
	const body = JSON.stringify({
		content: `[${os.hostname}] ${context}:\n\`\`\`\n${error.stack}\n\`\`\``,
	})
	// eslint-disable-next-line no-console
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
