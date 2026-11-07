import { Zero } from '@rocicorp/zero'

type ZeroLogSink = NonNullable<ConstructorParameters<typeof Zero>[0]['logSink']>
type ZeroLogLevel = Parameters<ZeroLogSink['log']>[0]
// Sentry trims context values around 16KB, and it does so silently in exactly the noisy cases.
const ZERO_LOG_BUFFER_LINES = 40
const ZERO_LOG_LINE_CHARS = 250

/**
 * Keeps Zero's recent log lines so a bootstrap timeout can carry them to Sentry: the
 * connection lifecycle is only logged at info, and the console sink would print all of it.
 * Warnings and errors still reach the console (and Sentry breadcrumbs) as before.
 */
export class ZeroLogBuffer implements ZeroLogSink {
	private readonly lines: string[] = []

	log(level: ZeroLogLevel, context: Record<string, unknown> | undefined, ...args: unknown[]) {
		if (level === 'warn' || level === 'error') {
			console[level](...(context ? [context] : []), ...args)
		}
		const ctx = context ? Object.entries(context).map(([k, v]) => `${k}=${String(v)}`) : []
		const line = [
			`+${Math.round(performance.now())}ms`,
			level,
			...ctx,
			...args.map(formatLogArg),
		].join(' ')
		this.lines.push(truncate(redactTokens(line), ZERO_LOG_LINE_CHARS))
		if (this.lines.length > ZERO_LOG_BUFFER_LINES) this.lines.shift()
	}

	recent(): string[] {
		return this.lines.slice()
	}
}

export function formatLogArg(arg: unknown): string {
	if (arg instanceof Error) {
		// Zero's errors carry their kind and errorBody (http status, reason) as own properties.
		const { cause: _cause, ...own } = arg as Error & Record<string, unknown>
		const extra = Object.keys(own).length ? ` ${formatLogArg(own)}` : ''
		const cause = arg.cause !== undefined ? ` (cause: ${formatLogArg(arg.cause)})` : ''
		return `${arg.name}: ${arg.message}${extra}${cause}`
	}
	if (typeof arg === 'string') return arg
	try {
		return JSON.stringify(arg)
	} catch {
		return String(arg)
	}
}

/** Zero echoes recent sent messages, `updateAuth` included, into some close errors. */
export function redactTokens(text: string): string {
	return text.replace(/eyJ[A-Za-z0-9_-]{10,}/g, 'eyJ<redacted>')
}

function truncate(text: string, max: number): string {
	return text.length > max ? `${text.slice(0, max)}…` : text
}
