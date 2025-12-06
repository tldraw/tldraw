import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import kleur from 'kleur'
import { lock } from 'proper-lockfile'
import stripAnsi from 'strip-ansi'

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

new MiniflareMonitor('wrangler', [
	'dev',
	'--env',
	'dev',
	'--test-scheduled',
	'--log-level',
	'info',
	'--var',
	'IS_LOCAL:true',
	...process.argv.slice(2),
]).start()

new SizeReporter().start()
