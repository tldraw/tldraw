import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { readFileSync } from 'fs'
import { createServer } from 'net'
import { resolve } from 'path'
import kleur from 'kleur'
import { lock } from 'proper-lockfile'
import stripAnsi from 'strip-ansi'
import * as toml from 'toml'

const lockfileName = __dirname

/**
 * a long time ago, workerd would regularly crash with a segfault but the error is not caught by the
 * process, so it will just hang. this script wraps the process, tailing the logs and restarting the
 * process if we encounter the string 'Segmentation fault'. we think this error is probably fixed
 * now.
 *
 * there's a separate issue where spawning multiple workerd instances at once would cause them to
 * fight and crash. we use a lockfile to start our wrokerd instances one at a time, waiting for the
 * previous one to be ready before we start the next.
 */
class MiniflareMonitor {
	private process: ChildProcessWithoutNullStreams | null = null

	constructor(
		private command: string,
		private args: string[] = []
	) {}

	public async start(): Promise<void> {
		await this.stop() // Ensure any existing process is stopped
		await this.lock()
		await console.log(`Starting wrangler...`)
		this.process = spawn(this.command, this.args, {
			env: {
				NODE_ENV: 'development',
				...process.env,
			},
		})

		this.process.stdout.on('data', (data: Buffer) => {
			this.handleOutput(stripAnsi(data.toString().replace('\r', '').trim()))
		})

		this.process.stderr.on('data', (data: Buffer) => {
			this.handleOutput(stripAnsi(data.toString().replace('\r', '').trim()), true)
		})
	}

	private handleOutput(output: string, err = false): void {
		if (!output) return

		if (output.includes('Ready on') && this.isLocked()) {
			this.release()
		}

		if (output.includes('Segmentation fault')) {
			console.error('Segmentation fault detected. Restarting Miniflare...')
			this.restart()
		} else if (!err) {
			console.log(output.replace('[mf:inf]', '')) // or handle the output differently
		} else {
			console.error(output.replace('[mf:err]', '')) // or handle the output differently
		}
	}

	private async restart(): Promise<void> {
		console.log('Restarting wrangler...')
		await this.stop()
		setTimeout(() => this.start(), 3000) // Restart after a short delay
	}

	private async stop(): Promise<void> {
		if (this.isLocked()) await this.release()
		if (this.process) {
			this.process.kill()
			this.process = null
		}
	}

	/** Synchronously kill the wrangler process. Safe to call from signal and `exit` handlers. */
	public dispose(signal: NodeJS.Signals = 'SIGTERM'): void {
		if (this.process) {
			this.process.kill(signal)
			this.process = null
		}
	}

	private _lockPromise?: Promise<() => Promise<void>>
	private isLocked() {
		return !!this._lockPromise
	}
	private async lock() {
		if (this.isLocked()) throw new Error('Already locked')
		console.log('Locking...')
		this._lockPromise = lock(lockfileName, {
			retries: {
				minTimeout: 500,
				retries: 10,
			},
		})
		await this._lockPromise
		console.log('Locked')
	}
	private async release() {
		if (!this.isLocked()) throw new Error('Not locked')
		console.log('Releasing...')
		const lockPromise = this._lockPromise!
		this._lockPromise = undefined
		const release = await lockPromise
		await release()
		console.log('Released')
	}
}

class SizeReporter {
	lastLineTime = Date.now()
	nextTick?: NodeJS.Timeout

	size = 0

	start() {
		console.log('Spawning size reporter...')
		const proc = spawn('yarn', [
			'run',
			'-T',
			'esbuild',
			'src/worker.ts',
			'--bundle',
			'--minify',
			'--watch',
			'--external:cloudflare:*',
			// need to list out node packages that are used in the worker.
			// otherwise, if we user platform=node, the bundle size is not reported correctly
			'--external:os',
			'--external:node:os',
			'--external:node:timers',
			'--external:crypto',
			'--external:stream',
			'--external:net',
			'--external:fs',
			'--external:perf_hooks',
			'--external:tls',
			'--external:path',
			'--external:node:path',
			'--external:node:process',
			'--external:node:child_process',
			'--external:node:events',
			'--external:dns',
			'--external:node:util',
			'--target=esnext',
			'--format=esm',
		])
		// listen for lines on stdin
		proc.stdout.on('data', (data) => {
			this.size += data.length
			this.lastLineTime = Date.now()
			clearTimeout(this.nextTick)
			this.nextTick = setTimeout(() => {
				console.log(
					kleur.bold(kleur.yellow('worker')),
					'is roughly',
					kleur.bold(kleur.cyan(Math.floor(this.size / 1024) + 'kb')),
					'(minified)\n'
				)
				this.size = 0
			}, 10)
		})
		proc.stderr.on('data', (data) => {
			console.log(data.toString())
		})
		process.on('SIGINT', () => {
			console.log('Int')
			proc.kill()
		})
		process.on('SIGTERM', () => {
			console.log('Term')
			proc.kill()
		})
		process.on('exit', () => {
			console.log('Exiting')
			proc.kill()
		})
	}
}

function readWranglerDevPort(): number | null {
	try {
		const parsed = toml.parse(readFileSync(resolve(process.cwd(), 'wrangler.toml'), 'utf8'))
		const port = parsed?.dev?.port
		return typeof port === 'number' ? port : null
	} catch {
		return null
	}
}

/** Read the numeric value of `flag <value>` from `args`, if present. */
function readArgPort(args: string[], flag: string): number | null {
	const idx = args.findIndex((a) => a === flag)
	if (idx >= 0 && args[idx + 1] != null) {
		const value = Number(args[idx + 1])
		return Number.isFinite(value) ? value : null
	}
	return null
}

function probePortFree(port: number): Promise<void> {
	return new Promise((res, rej) => {
		const server = createServer()
		server.unref()
		server.once('error', rej)
		server.once('listening', () => server.close(() => res()))
		server.listen(port, '0.0.0.0')
	})
}

async function ensurePortFreeOrExit(port: number, what: 'serving' | 'inspector') {
	try {
		await probePortFree(port)
	} catch (err: any) {
		if (err?.code === 'EADDRINUSE') {
			const detail =
				what === 'inspector'
					? `process is already listening on it. Wrangler would silently fail to bind its\n` +
						`serving port — the worker would never come up, with no error in the log. This is\n` +
						`usually another dev stack running on the same instance; give this one a different\n` +
						`DOTCOM_DEV_INSTANCE (or run it from its own worktree).`
					: `process is already listening on it. Wrangler would silently fall back to a random\n` +
						`port, but the rest of the dev stack expects ${port} — so /api requests from the\n` +
						`client would either 404 or hit the wrong worker.`
			console.error(
				`\n${kleur.red(kleur.bold(`✖ ${what === 'inspector' ? 'Inspector port' : 'Port'} ${port} is already in use.`))}\n\n` +
					`This worker (${kleur.cyan(process.cwd())}) needs ${what} port ${port}, but another\n` +
					`${detail}\n\n` +
					`Find what's holding it:\n` +
					`  ${kleur.bold(`lsof -nP -iTCP:${port} -sTCP:LISTEN`)}\n\n` +
					`Then stop that process and re-run.\n`
			)
		} else {
			console.error(`Failed to probe port ${port}:`, err)
		}
		process.exit(1)
	}
}

async function main() {
	// The dotcom dev stack passes each worker an explicit per-instance `--port` and
	// `--inspector-port` (see apps/dotcom/zero-cache/run-dotcom-worker.ts) so worktrees don't collide.
	// Other workers (examples, bemo) just use their wrangler.toml port. Probe both ports up front:
	// wrangler otherwise silently falls back to a random serving port, and a clashing inspector port
	// makes the worker fail to bind with no error in the log.
	const args = process.argv.slice(2)

	const servingPort = readArgPort(args, '--port') ?? readWranglerDevPort()
	if (servingPort != null) await ensurePortFreeOrExit(servingPort, 'serving')

	const inspectorPort = readArgPort(args, '--inspector-port')
	if (inspectorPort != null) await ensurePortFreeOrExit(inspectorPort, 'inspector')

	const monitor = new MiniflareMonitor('wrangler', [
		'dev',
		'--env',
		'dev',
		'--test-scheduled',
		'--log-level',
		'info',
		'--var',
		'IS_LOCAL:true',
		...args,
	])
	monitor.start()

	new SizeReporter().start()

	// Tear down wrangler (and its workerd child) when this process is asked to stop or exits. Without
	// this the worker keeps holding its inspector/dev port after the parent goes away, blocking reruns.
	let shuttingDown = false
	const shutdown = () => {
		if (shuttingDown) return
		shuttingDown = true
		monitor.dispose()
		process.exit(0)
	}
	process.on('SIGINT', shutdown)
	process.on('SIGTERM', shutdown)
	process.on('SIGHUP', shutdown)
	// Last resort if we exit through a path that bypassed shutdown(): SIGKILL so wrangler can't catch
	// it and linger holding its dev port. The graceful SIGTERM is only for the signal path above.
	process.on('exit', () => monitor.dispose('SIGKILL'))
}

main()
