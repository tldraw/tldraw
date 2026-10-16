import { parseArgs, usage } from './app/cli'
import { installDomGlobals } from './bootstrap/dom'
import { FrameScheduler } from './bootstrap/frame'

// Nothing above this line may import tldraw: it reads `window`, `navigator`, storage and
// `BroadcastChannel` while its modules evaluate, so the DOM globals must exist first and the App
// is loaded with a dynamic import below.

const parsed = parseArgs(process.argv.slice(2))
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

const dom = installDomGlobals()
const frame = new FrameScheduler({ maxFps: options.maxFps ?? undefined })
frame.install(dom.window)

try {
	const { runCli } = await import('./app/createApp')
	await runCli(options, { dom, frame })
} catch (error) {
	// Terminal.start() installs the handlers that restore the tty; a failure before that point
	// never touched it, and one after it has already been restored by the crash handler.
	const text = error instanceof Error ? (error.stack ?? error.message) : String(error)
	process.stderr.write(`tldraw-tui: ${text}\n`)
	process.exit(1)
}
