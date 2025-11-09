function sanitizeVariables(errorOutput: string): string {
	const regex = /(--var\s+(\w+):[^ \n]+)/g

	const sanitizedOutput = errorOutput.replace(regex, (_, match) => {
		const [variable] = match.split(':')
		return `${variable}:*`
	})

	return sanitizedOutput
}

export class Discord {
	static AT_TEAM_MENTION = '<@&959380625100513310>'

	constructor(opts: {
		webhookUrl: string
		shouldNotify: boolean
		totalSteps?: number
		messagePrefix?: string
	}) {
		this.webhookUrl = opts.webhookUrl
		this.shouldNotify = opts.shouldNotify
		this.totalSteps = opts.totalSteps ?? 0
		this.messagePrefix = opts.messagePrefix ?? ''
	}

	webhookUrl: string
	shouldNotify: boolean
	totalSteps: number
	currentStep = 0
	messagePrefix: string

	private async send(method: string, url: string, body: unknown): Promise<any> {
		const response = await fetch(`${this.webhookUrl}${url}`, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})
		if (!response.ok) {
			throw new Error(`Discord webhook request failed: ${response.status} ${response.statusText}`)
		}
		return response.json()
	}

	async message(content: string, { always = false }: { always?: boolean } = {}) {
		if (!always && !this.shouldNotify) {
			return {
				edit: () => {
					// noop
				},
			}
		}

		const prefixedContent = this.messagePrefix ? `${this.messagePrefix} ${content}` : content
		const message = await this.send('POST', '?wait=true', {
			content: sanitizeVariables(prefixedContent),
		})

		return {
			edit: async (newContent: string) => {
				const prefixedNewContent = this.messagePrefix
					? `${this.messagePrefix} ${newContent}`
					: newContent
				await this.send('PATCH', `/messages/${message.id}`, {
					content: sanitizeVariables(prefixedNewContent),
				})
			},
		}
	}

	async step<T>(content: string, cb: () => Promise<T>): Promise<T> {
		this.currentStep++
		const message = await this.message(`[${this.currentStep}/${this.totalSteps}] ${content}...`)
		try {
			const result = await cb()
			await message.edit(`${content} ✅`)
			return result
		} catch (err) {
			await message.edit(`${content} ❌`)
			throw err
		}
	}
}
