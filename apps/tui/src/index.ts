import { parseArgs, parseRenderArgs, renderUsage, usage } from './app/cli'
import { installDomGlobals } from './bootstrap/dom'
import { FrameScheduler } from './bootstrap/frame'
import { Terminal, type OutputLike } from './terminal/Terminal'

// Nothing above this line may import tldraw or jsdom: tldraw reads `window`, `navigator`, storage
// and `BroadcastChannel` while its modules evaluate, so the DOM globals must exist first and the
// App is loaded with a dynamic import below. The terminal layer imports neither.

const argv = process.argv.slice(2)

if (argv[0] === 'render') {
	const render = parseRenderArgs(argv.slice(1))
	if (!render.ok) {
		process.stderr.write(`tldraw-tui render: ${render.error}\n\n${renderUsage()}`)
		process.exit(2)
	}
	if (render.options.help) {
		process.stdout.write(renderUsage())
		process.exit(0)
	}
	installDomGlobals()
	const { runRender } = await import('./app/render')
	process.exit(await runRender(render.options, { stdout: process.stdout, stderr: process.stderr }))
}

const parsed = parseArgs(argv)
if (!parsed.ok) {
	process.stderr.write(`tldraw-tui: ${parsed.error}\n\n${usage()}`)
	process.exit(2)
}
const options = parsed.options
if (options.help) {
	process.stdout.write(usage())
	process.exit(0)
}
if (!process.stdout.isTTY || !process.stdin.isTTY) {
	process.stderr.write(`${usage()}\ntldraw-tui needs an interactive terminal.\n`)
	process.exit(1)
}

// The terminal before the editor: entering raw mode and the alternate screen takes a moment, loading
// jsdom and tldraw takes most of a second. Started here, the probe's wait overlaps the load, keys
// typed meanwhile are queued instead of echoed by the shell, and the screen answers at once.
const terminal = new Terminal({
	input: process.stdin,
	output: process.stdout as unknown as OutputLike,
	env: process.env,
	mouse: options.mouse,
	processHandlers: true,
	colorMode: options.color ?? undefined,
})
const starting = terminal.start()
terminal.write('\x1b[3;2HLoading tldraw...')

const dom = installDomGlobals()
const frame = new FrameScheduler({ maxFps: options.maxFps ?? undefined })
frame.install(dom.window)

try {
	const { runCli } = await import('./app/createApp')
	await runCli(options, { dom, frame, terminal, starting })
} catch (error) {
	// The alternate screen is on by now: restore first, or the message vanishes with it.
	terminal.stop()
	const text = error instanceof Error ? (error.stack ?? error.message) : String(error)
	process.stderr.write(`tldraw-tui: ${text}\n`)
	process.exit(1)
}
