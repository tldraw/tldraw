/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const { spawn } = require('child_process')
const colors = require('picocolors')

class Monitor {
	lastLineTime = Date.now()
	nextTick = 0

	size = 0

	start() {
		console.log('Spawning')
		const proc = spawn('npx', ['esbuild', 'src/lib/worker.ts', '--bundle', '--minify', '--watch'])
		// listen for lines on stdin
		proc.stdout.on('data', (data) => {
			this.size += data.length
			this.lastLineTime = Date.now()
			clearTimeout(this.nextTick)
			this.nextTick = setTimeout(() => {
				console.log(
					colors.bold(colors.yellow('dotcom-worker')),
					'is roughly',
					colors.bold(colors.cyan(Math.floor(this.size / 1024) + 'kb')),
					'(minified)\n'
				)
				this.size = 0
			}, 10)
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

new Monitor().start()
