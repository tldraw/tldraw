const MASK_PLACEHOLDER = '\x00MASKED\x00'

function sanitizeVariables(errorOutput: string, secretValues?: string[]): string {
	let sanitized = errorOutput

	// Value-based masking: replace any occurrence of known secret values (like GitHub Actions).
	// Uses an internal placeholder so regex patterns below can't re-match masked output.
	// Sort longest-first so a longer secret is masked before a shorter substring of it.
	if (secretValues) {
		const sorted = secretValues.filter((v) => v.length >= 8).sort((a, b) => b.length - a.length)
		for (const value of sorted) {
			sanitized = sanitized.replaceAll(value, MASK_PLACEHOLDER)
		}
	}

	// Sanitize wrangler --var KEY:VALUE patterns
	sanitized = sanitized.replace(/(--var\s+)(\w+):[^ \n]+/g, '$1$2:`***`')

	// Sanitize KEY=VALUE patterns where KEY looks like an env var and value is long enough
	// to be a secret (e.g. flyctl secrets set). Short values like =debug are left alone.
	sanitized = sanitized.replace(/\b([A-Z][A-Z_0-9]{2,})=([^ \n]{8,})/g, '$1=`***`')

	// Sanitize --token VALUE and --token=VALUE patterns (e.g. vercel --token xxx)
	sanitized = sanitized.replace(/(--token[\s=])\S+/g, '$1`***`')

	// Sanitize connection strings (postgres://, redis://, etc.)
	sanitized = sanitized.replace(
		/\b(postgres|postgresql|mysql|redis|mongodb|amqp):\/\/[^\s"']+/gi,
		'$1://`***`'
	)

	// Replace internal placeholder with final mask
	sanitized = sanitized.replaceAll(MASK_PLACEHOLDER, '`***`')

	return sanitized
}

export class Discord {
	static AT_TEAM_MENTION = '<@&1414904550917144586>'

	constructor(opts: {
		webhookUrl: string
		shouldNotify: boolean
		totalSteps?: number
		messagePrefix?: string
		secretValues?: string[]
	}) {
		this.webhookUrl = opts.webhookUrl
		this.shouldNotify = opts.shouldNotify
		this.totalSteps = opts.totalSteps ?? 0
		this.messagePrefix = opts.messagePrefix ?? ''
		this.secretValues = opts.secretValues
	}

	webhookUrl: string
	shouldNotify: boolean
	totalSteps: number
	currentStep = 0
	messagePrefix: string
	private secretValues?: string[]

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
			content: sanitizeVariables(prefixedContent, this.secretValues),
		})

		return {
			edit: async (newContent: string) => {
				const prefixedNewContent = this.messagePrefix
					? `${this.messagePrefix} ${newContent}`
					: newContent
				await this.send('PATCH', `/messages/${message.id}`, {
					content: sanitizeVariables(prefixedNewContent, this.secretValues),
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
