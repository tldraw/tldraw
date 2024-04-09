// at the time of writing, workerd will regularly crash with a segfault
// but the error is not caught by the process, so it will just hang
// this script wraps the process, tailing the logs and restarting the process
// if we encounter the string 'Segmentation fault'

import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import stripAnsi from 'strip-ansi'

// eslint-disable-next-line no-console
const log = console.log

class MiniflareMonitor {
	private process: ChildProcessWithoutNullStreams | null = null

	constructor(
		private command: string,
		private args: string[] = []
	) {}

	public start(): void {
		this.stop() // Ensure any existing process is stopped
		log(`Starting wrangler...`)
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
		if (output.includes('Segmentation fault')) {
			console.error('Segmentation fault detected. Restarting Miniflare...')
			this.restart()
		} else if (!err) {
			log(output.replace('[mf:inf]', '')) // or handle the output differently
		}
	}

	private restart(): void {
		log('Restarting wrangler...')
		this.stop()
		setTimeout(() => this.start(), 3000) // Restart after a short delay
	}

	private stop(): void {
		if (this.process) {
			this.process.kill()
			this.process = null
		}
	}
}

const monitor = new MiniflareMonitor('wrangler', [
	'dev',
	'--env',
	'dev',
	'--test-scheduled',
	'--log-level',
	'info',
	'--var',
	'IS_LOCAL:true',
])
monitor.start()
