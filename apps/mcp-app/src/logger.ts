/**
 * Structured logger for the tldraw MCP Durable Object.
 *
 * Outputs JSON lines to console.error so that
 * Cloudflare Workers Observability can capture and query them.
 */

export class Logger {
	constructor(private prefix: string) {}

	info(message: string, data?: Record<string, unknown>) {
		console.error(
			JSON.stringify({ level: 'info', prefix: this.prefix, message, ...data, ts: Date.now() })
		)
	}

	error(message: string, data?: Record<string, unknown>) {
		console.error(
			JSON.stringify({ level: 'error', prefix: this.prefix, message, ...data, ts: Date.now() })
		)
	}

	debug(message: string, data?: Record<string, unknown>) {
		console.error(
			JSON.stringify({ level: 'debug', prefix: this.prefix, message, ...data, ts: Date.now() })
		)
	}

	child(prefix: string): Logger {
		return new Logger(`${this.prefix}:${prefix}`)
	}

	/** Returns a log function compatible with RegisterToolsOptions.log */
	toLogFn(): (...args: unknown[]) => void {
		return (...args: unknown[]) => {
			this.info(args.map(String).join(' '))
		}
	}
}
