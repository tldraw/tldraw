import { App } from '../App'
import type { DomGlobals } from '../bootstrap/dom'
import type { FrameScheduler } from '../bootstrap/frame'
import { captureToFile } from '../capture/capture'
import type { CaptureScope } from '../capture/types'
import { getPrefsPath, readPrefsSeed } from '../file/tldrFile'
import {
	Terminal,
	type InputLike,
	type OutputLike,
	type TerminalCapabilities,
} from '../terminal/Terminal'
import type { CliOptions } from './cli'

export interface RunCliDeps {
	dom: DomGlobals
	frame: FrameScheduler
	env?: NodeJS.ProcessEnv
	input?: InputLike
	output?: OutputLike
	/** A terminal `index.ts` already started so the probe overlapped the module load. */
	terminal?: Terminal
	/** Its pending `start()`, awaited here so a start failure surfaces before the editor is built. */
	starting?: Promise<TerminalCapabilities>
	onQuit?(code: number): void
}

/**
 * Builds and starts the app for the command line. This module imports tldraw (through App), so
 * `index.ts` loads it with a dynamic import after the DOM globals exist.
 */
export async function runCli(options: CliOptions, deps: RunCliDeps): Promise<App> {
	const env = deps.env ?? process.env
	const prefsPath = getPrefsPath(env)

	// tldraw reads TLDRAW_USER_DATA_v3 lazily (first getUserPreferences call), so seeding right
	// before the editor is created is equivalent to seeding before the import.
	const seed = await readPrefsSeed(prefsPath)
	for (const [key, value] of Object.entries(seed)) {
		deps.dom.window.localStorage.setItem(key, value)
	}

	const terminal =
		deps.terminal ??
		new Terminal({
			input: deps.input ?? process.stdin,
			output: deps.output ?? (process.stdout as unknown as OutputLike),
			env,
			mouse: options.mouse,
			processHandlers: true,
			colorMode: options.color ?? undefined,
		})
	if (deps.starting) await deps.starting
	const app = new App({
		terminal,
		frame: deps.frame,
		dom: deps.dom,
		filePath: options.filePath,
		colorMode: options.scheme,
		glyphs: options.glyphs,
		debug: options.debug,
		env,
		osc52: options.osc52 ?? undefined,
		pointerMode: !options.mouse,
		prefsPath,
		onQuit: deps.onQuit ?? ((code) => process.exit(code)),
	})
	await app.start()
	if (options.capture) watchCaptureSignal(app, options.capture, options.captureScope)
	return app
}

/**
 * `--capture PATH`: SIGUSR1 writes the canvas to PATH, so a script or agent driving the app through
 * a terminal can look at it (`kill -USR1 <pid>`). The status bar confirms each capture.
 */
function watchCaptureSignal(app: App, path: string, scope: CaptureScope) {
	process.on('SIGUSR1', () => {
		const ctx = app.getContext()
		void captureToFile(ctx.editor, path, { scope, renderToText: ctx.renderToText }).then(
			(result) => {
				if (result.ok) ctx.ui.setHint(`Captured ${result.path}`)
				else ctx.ui.showError(result.error, ctx.now())
				ctx.requestRender()
			}
		)
	})
}
