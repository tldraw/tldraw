import { Zero } from '@rocicorp/zero'

type ZeroLogSink = NonNullable<ConstructorParameters<typeof Zero>[0]['logSink']>
type ZeroLogLevel = Parameters<ZeroLogSink['log']>[0]
const ZERO_LOG_BUFFER_LINES = 60

/**
 * Keeps Zero's recent info-level log lines so a bootstrap timeout can carry them to Sentry: the
 * connect/disconnect/poke lifecycle is only logged at info, and the console sink would print all of
 * it. Warnings and errors still reach the console (and Sentry breadcrumbs) as before.
 */
export class ZeroLogBuffer implements ZeroLogSink {
	private readonly lines: string[] = []

	log(level: ZeroLogLevel, context: Record<string, unknown> | undefined, ...args: unknown[]) {
		if (level === 'warn' || level === 'error') {
			console[level](...(context ? [context] : []), ...args)
		}
		const ctx = context
			? Object.entries(context)
					.map(([k, v]) => `${k}=${String(v)}`)
					.join(' ')
			: ''
		const line = `+${Math.round(performance.now())}ms ${level} ${ctx} ${args.map(formatLogArg).join(' ')}`
		this.lines.push(line.slice(0, 400))
		if (this.lines.length > ZERO_LOG_BUFFER_LINES) this.lines.shift()
	}

	recent(): string[] {
		return this.lines.slice()
	}
}

export function formatLogArg(arg: unknown): string {
	if (arg instanceof Error) return `${arg.name}: ${arg.message}`
	if (typeof arg === 'string') return arg
	try {
		return JSON.stringify(arg)
	} catch {
		return String(arg)
	}
}
