import { writeSync } from 'node:fs'
import { ColorMode, Rgb } from './colors'
import { EventSink, InputParser, InputParserOptions, TerminalEvent } from './InputParser'
import {
	ambiguousWideFromCpr,
	defaultOsc52,
	isGnuScreen,
	isUtf8Locale,
	KITTY_FLAGS,
	parseOsc11Color,
	PROBE_ERASE,
	PROBE_SEQUENCE,
	PROBE_TIMEOUT_MS,
	resolveColorMode,
} from './probe'

export interface OutputLike {
	readonly columns?: number
	readonly rows?: number
	readonly isTTY?: boolean
	readonly fd?: number
	write(s: string): boolean
	on(ev: string, fn: (...a: any[]) => void): unknown
	off?(ev: string, fn: (...a: any[]) => void): unknown
	_handle?: { setBlocking?(b: boolean): void }
	writableLength?: number
}

export interface InputLike {
	readonly isTTY?: boolean
	setRawMode?(b: boolean): void
	on(ev: string, fn: (...a: any[]) => void): unknown
	off?(ev: string, fn: (...a: any[]) => void): unknown
	resume?(): void
	pause?(): void
}

export interface TerminalCapabilities {
	kitty: boolean
	truecolor: ColorMode
	/** Background reported by OSC 11, else null (COLORFGBG only gives a light/dark hint). */
	background: Rgb | null
	ambiguousWide: boolean
	mouse: boolean
	/** Hover (any-motion mouse) is unreliable under GNU screen. */
	hover: boolean
	syncOutput: boolean
	osc52: boolean
	utf8: boolean
	/**
	 * xterm modifyOtherKeys was requested (`CSI > 4 ; 2 m`). Nothing confirms support; only a key
	 * arriving as `CSI 27 ; m ; k ~` proves it, which `KeyEvent.encoding` reports.
	 */
	modifyOtherKeys: boolean
}

export interface TerminalOptions {
	input: InputLike
	output: OutputLike
	env?: NodeJS.ProcessEnv
	mouse?: boolean
	probe?: boolean
	colorMode?: ColorMode
	/** Skip the TTY check (tests use in-memory streams). */
	assumeTTY?: boolean
	/** Register exit/signal/crash handlers on `process` that restore the terminal. */
	processHandlers?: boolean
	probeTimeoutMs?: number
	/** Enable xterm modifyOtherKeys when the kitty protocol is unavailable. Default true. */
	modifyOtherKeys?: boolean
	parser?: InputParserOptions
}

const ENTER_COMMON = '\x1b[?1049h\x1b[?25l\x1b[?7l\x1b[?1004h\x1b[?2004h'
const MOUSE_ON = '\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1006h'
// With mouse reporting off, alternate scroll (1007) would turn the wheel into arrow keys.
const MOUSE_OFF = '\x1b[?1007l'
// Events decoded before anyone listens (keys typed while the editor loads) wait for the first
// listener; replies are dropped because only the probe consumes them.
const EARLY_EVENT_LIMIT = 1024
// The restore sequence must reach a backed-up terminal: a stalled reader frees room every few
// hundred milliseconds, so the retry loop sleeps in short steps up to this total.
const RESTORE_RETRY_MS = 1000
const RESTORE_SLEEP_MS = 5

interface ProbeState {
	kitty: number | null
	background: Rgb | null
	cprCol: number | null
	da1: boolean
}

/**
 * Owns the tty: modes, capability probing, input decoding, output with backpressure tracking,
 * and restoration on every exit path.
 */
export class Terminal {
	private readonly input: InputLike
	private readonly output: OutputLike
	private readonly env: NodeJS.ProcessEnv
	private readonly opts: TerminalOptions
	private readonly parser: InputParser
	private readonly listeners: EventSink[] = []
	private readonly drainListeners: (() => void)[] = []
	private readonly resumeListeners: (() => void)[] = []
	private readonly exitListeners: (() => void)[] = []
	private readonly earlyEvents: TerminalEvent[] = []
	private caps: TerminalCapabilities
	private started = false
	private starting: Promise<TerminalCapabilities> | null = null
	private modesActive = false
	private listening = false
	private kittyPushed = false
	private mokEnabled = false
	private alternateScrollOff = false
	private cursorVisible = false
	private needDrain = false
	private drainPoll: ReturnType<typeof setInterval> | null = null
	private pendingTimer: ReturnType<typeof setTimeout> | null = null
	private probe: ProbeState | null = null
	private probeResolve: (() => void) | null = null
	private processHandlersInstalled = false
	private readonly processHandlers: [string, (...a: any[]) => void][] = []
	private bytesWritten = 0
	private writeCount = 0
	private readonly dispatchBound: EventSink
	private readonly onDataBound: (chunk: Uint8Array) => void
	private readonly onResizeBound: () => void
	private readonly onDrainBound: () => void

	constructor(opts: TerminalOptions) {
		this.opts = opts
		this.input = opts.input
		this.output = opts.output
		this.env = opts.env ?? process.env
		this.parser = new InputParser(opts.parser)
		this.caps = this.capabilitiesFromEnv()
		this.dispatchBound = (e) => this.dispatch(e)
		this.onDataBound = (chunk) => this.onData(chunk)
		this.onResizeBound = () => this.onResize()
		this.onDrainBound = () => this.handleDrain()
	}

	private capabilitiesFromEnv(): TerminalCapabilities {
		const mouse = this.opts.mouse !== false
		return {
			kitty: false,
			truecolor: resolveColorMode(this.env, this.opts.colorMode),
			background: null,
			ambiguousWide: false,
			mouse,
			hover: mouse && !isGnuScreen(this.env),
			syncOutput: true,
			osc52: defaultOsc52(this.env),
			utf8: isUtf8Locale(this.env),
			modifyOtherKeys: false,
		}
	}

	/**
	 * Enters raw mode and the alternate screen, enables focus/paste/mouse reporting, probes the
	 * terminal (bounded by a DA1 fence, max 100 ms) and negotiates the kitty keyboard protocol.
	 */
	start(): Promise<TerminalCapabilities> {
		if (this.started) return Promise.resolve(this.caps)
		// A second call while the probe is open (the app starting after an early start) must not
		// re-enter the modes; a failed start is not cached.
		if (!this.starting) {
			this.starting = this.doStart().catch((error: unknown) => {
				this.starting = null
				throw error
			})
		}
		return this.starting
	}

	private async doStart(): Promise<TerminalCapabilities> {
		if (!this.opts.assumeTTY) {
			if (!this.output.isTTY) {
				throw new Error('tldraw-tui needs an interactive terminal: stdout is not a TTY')
			}
			if (!this.input.isTTY) {
				throw new Error('tldraw-tui needs an interactive terminal: stdin is not a TTY')
			}
		}
		// Before the modes: a throw from the 'data' listener during the probe is an uncaughtException,
		// and without the handlers it would leave the alternate screen and mouse reporting on.
		if (this.opts.processHandlers) this.installProcessHandlers()
		this.enterModes()
		if (this.opts.probe !== false) await this.runProbe()
		this.finishCapabilities()
		this.enableKeyboardProtocol()
		this.started = true
		return this.caps
	}

	private enterModes(): void {
		this.input.setRawMode?.(true)
		this.input.resume?.()
		try {
			// Node makes tty stdout blocking on POSIX; a slow terminal would then stall the event
			// loop (and input) for the whole write. Non-blocking lets write() report backpressure.
			this.output._handle?.setBlocking?.(false)
		} catch {
			// Some streams have no handle; blocking writes still work.
		}
		this.rawWrite(ENTER_COMMON + (this.caps.mouse ? MOUSE_ON : MOUSE_OFF) + '\x1b[H')
		this.alternateScrollOff = !this.caps.mouse
		this.cursorVisible = false
		this.modesActive = true
		if (!this.listening) {
			this.input.on('data', this.onDataBound)
			this.output.on('resize', this.onResizeBound)
			this.output.on('drain', this.onDrainBound)
			this.listening = true
		}
	}

	private runProbe(): Promise<void> {
		return new Promise((resolve) => {
			this.probe = { kitty: null, background: null, cprCol: null, da1: false }
			let settled = false
			// Timers run before the poll phase: when the app's synchronous load outlasts the timeout,
			// the replies are already in the tty buffer, so yield once and let them be read first.
			const timer = setTimeout(
				() => setImmediate(() => done()),
				this.opts.probeTimeoutMs ?? PROBE_TIMEOUT_MS
			)
			const done = () => {
				if (settled) return
				settled = true
				clearTimeout(timer)
				this.probeResolve = null
				this.rawWrite(PROBE_ERASE)
				resolve()
			}
			this.probeResolve = done
			this.rawWrite(PROBE_SEQUENCE)
		})
	}

	private finishCapabilities(): void {
		const p = this.probe
		const base = this.capabilitiesFromEnv()
		this.caps = {
			...base,
			kitty: p !== null && p.kitty !== null,
			background: p?.background ?? null,
			ambiguousWide: ambiguousWideFromCpr(p?.cprCol),
		}
	}

	private enableKeyboardProtocol(): void {
		if (this.caps.kitty) {
			this.rawWrite(`\x1b[>${KITTY_FLAGS}u`)
			this.kittyPushed = true
			this.parser.setKittyActive(true)
		} else if (this.opts.modifyOtherKeys !== false) {
			this.rawWrite('\x1b[>4;2m')
			this.mokEnabled = true
			this.caps.modifyOtherKeys = true
		}
	}

	/** Restores the terminal. Idempotent; safe from exit handlers (synchronous writes). */
	stop(): void {
		this.restore(true)
	}

	private restore(write: boolean): void {
		if (this.pendingTimer) {
			clearTimeout(this.pendingTimer)
			this.pendingTimer = null
		}
		this.stopDrainPoll()
		this.starting = null
		if (!this.modesActive) return
		this.modesActive = false
		this.started = false
		if (write) {
			let seq = '\x1b[?2026l'
			if (this.kittyPushed) seq += '\x1b[<u'
			if (this.mokEnabled) seq += '\x1b[>4m'
			seq += '\x1b[?1003l\x1b[?1002l\x1b[?1000l\x1b[?1006l'
			seq += '\x1b[?2004l\x1b[?1004l'
			// Alternate scroll is a user setting; only put back what enterModes changed.
			if (this.alternateScrollOff) seq += '\x1b[?1007h'
			seq += '\x1b[0m\x1b[?25h\x1b[?7h\x1b[?1049l'
			this.writeRestore(seq)
		}
		this.kittyPushed = false
		this.mokEnabled = false
		this.alternateScrollOff = false
		this.parser.setKittyActive(false)
		try {
			this.input.setRawMode?.(false)
		} catch {
			// The tty may already be gone (SIGHUP).
		}
		this.input.pause?.()
		if (this.listening) {
			this.input.off?.('data', this.onDataBound)
			this.output.off?.('resize', this.onResizeBound)
			this.output.off?.('drain', this.onDrainBound)
			this.listening = false
		}
	}

	/**
	 * The restore goes through the fd so it jumps ahead of whatever frame the stream still holds.
	 * enterModes() made the fd non-blocking, so with the terminal backed up writeSync answers EAGAIN
	 * (and may write part of the sequence); a stream fallback would be discarded by process.exit(),
	 * so the loop retries with short synchronous sleeps until the kernel buffer has room.
	 */
	private writeRestore(seq: string): void {
		const fd = this.output.fd
		if (typeof fd === 'number') {
			let rest = Buffer.from(seq, 'utf8')
			const deadline = Date.now() + RESTORE_RETRY_MS
			let failed = false
			while (rest.length > 0) {
				try {
					rest = rest.subarray(writeSync(fd, rest))
				} catch (e) {
					if ((e as NodeJS.ErrnoException).code !== 'EAGAIN' || Date.now() >= deadline) {
						failed = true
						break
					}
					sleepSync(RESTORE_SLEEP_MS)
				}
			}
			if (!failed) return
		}
		try {
			this.output.write(seq)
		} catch {
			// Nothing left to restore to.
		}
	}

	/** stop() plus removal of the process handlers. */
	dispose(): void {
		this.stop()
		if (this.processHandlersInstalled) {
			for (const [ev, fn] of this.processHandlers) process.off(ev, fn)
			this.processHandlers.length = 0
			this.processHandlersInstalled = false
		}
	}

	private installProcessHandlers(): void {
		if (this.processHandlersInstalled) return
		this.processHandlersInstalled = true
		const add = (ev: string, fn: (...a: any[]) => void) => {
			this.processHandlers.push([ev, fn])
			process.on(ev, fn)
		}
		add('exit', () => this.stop())
		add('SIGINT', () => {
			this.runExitListeners()
			this.stop()
			process.exit(130)
		})
		add('SIGTERM', () => {
			this.runExitListeners()
			this.stop()
			process.exit(143)
		})
		add('SIGHUP', () => {
			this.runExitListeners()
			// The controlling terminal is gone; writing to it would only raise EIO.
			this.restore(false)
			process.exit(129)
		})
		add('SIGTSTP', () => {
			// Raw mode has ISIG off, so this only arrives from `kill -TSTP`; restore first or the
			// shell prompt lands on the alternate screen with mouse reporting on. SIGSTOP cannot be
			// caught, so it stops the process for real; the SIGCONT handler re-enters the modes.
			this.restore(true)
			process.kill(process.pid, 'SIGSTOP')
		})
		const crash = (err: unknown) => {
			this.stop()
			const text = err instanceof Error ? (err.stack ?? err.message) : String(err)
			process.stderr.write(text + '\n')
			process.exit(1)
		}
		add('uncaughtException', crash)
		add('unhandledRejection', crash)
		add('SIGCONT', () => this.resume())
	}

	private runExitListeners(): void {
		for (const fn of this.exitListeners) {
			try {
				fn()
			} catch {
				// The process is exiting; the terminal restore below matters more.
			}
		}
	}

	/**
	 * Re-enters the terminal after SIGCONT (the SIGTSTP handler restored it before stopping), then
	 * asks the app for a full repaint through `onResume`.
	 */
	resume(): void {
		this.enterModes()
		// Kitty keeps a per-screen mode stack that survived the stop; pop our old entry before
		// pushing again so stop() still leaves the stack balanced (a pop on an empty stack is a no-op).
		if (this.kittyPushed) this.rawWrite('\x1b[<u')
		this.kittyPushed = false
		this.mokEnabled = false
		this.enableKeyboardProtocol()
		this.started = true
		for (const fn of this.resumeListeners) fn()
	}

	onEvent(fn: EventSink): () => void {
		this.listeners.push(fn)
		for (const e of this.earlyEvents.splice(0)) fn(e)
		return () => {
			const i = this.listeners.indexOf(fn)
			if (i >= 0) this.listeners.splice(i, 1)
		}
	}

	/**
	 * Called from the SIGINT/SIGTERM/SIGHUP handlers right before the terminal is restored and the
	 * process exits; only synchronous work (persisting preferences) can complete there.
	 */
	onExit(fn: () => void): () => void {
		this.exitListeners.push(fn)
		return () => {
			const i = this.exitListeners.indexOf(fn)
			if (i >= 0) this.exitListeners.splice(i, 1)
		}
	}

	/** Called once when the output buffer has drained after `isBlocked()` became true. */
	onDrain(fn: () => void): () => void {
		this.drainListeners.push(fn)
		return () => {
			const i = this.drainListeners.indexOf(fn)
			if (i >= 0) this.drainListeners.splice(i, 1)
		}
	}

	/** Called after the terminal was re-entered on SIGCONT; the app should repaint everything. */
	onResume(fn: () => void): () => void {
		this.resumeListeners.push(fn)
		return () => {
			const i = this.resumeListeners.indexOf(fn)
			if (i >= 0) this.resumeListeners.splice(i, 1)
		}
	}

	private dispatch(e: TerminalEvent): void {
		if (e.type === 'reply' && this.probe && this.probeResolve) {
			const p = this.probe
			switch (e.kind) {
				case 'kitty':
					p.kitty = Number(e.data?.flags ?? 0)
					break
				case 'osc11':
					p.background = parseOsc11Color(String(e.data?.color ?? ''))
					break
				case 'cpr':
					p.cprCol = Number(e.data?.col ?? 0)
					break
				case 'da1':
					p.da1 = true
					this.probeResolve()
					break
				default:
					break
			}
		}
		if (this.listeners.length === 0) {
			if (e.type !== 'reply' && this.earlyEvents.length < EARLY_EVENT_LIMIT)
				this.earlyEvents.push(e)
			return
		}
		for (const fn of this.listeners) fn(e)
	}

	private onData(chunk: Uint8Array): void {
		try {
			this.parser.feed(chunk, this.dispatchBound)
		} catch (error) {
			// A parser throw would surface as an uncaughtException; restore the terminal first so the
			// stack is readable even without process handlers.
			this.stop()
			throw error
		}
		this.armPendingTimer()
	}

	private armPendingTimer(): void {
		if (this.pendingTimer) {
			clearTimeout(this.pendingTimer)
			this.pendingTimer = null
		}
		if (!this.parser.hasPending()) return
		const ms = this.parser.pendingTimeoutMs()
		if (ms <= 0) {
			this.parser.flushPending(this.dispatchBound)
			if (this.parser.hasPending()) this.armPendingTimer()
			return
		}
		this.pendingTimer = setTimeout(() => {
			this.pendingTimer = null
			this.parser.flushPending(this.dispatchBound)
			if (this.parser.hasPending()) this.armPendingTimer()
		}, ms)
	}

	private onResize(): void {
		const { cols, rows } = this.getSize()
		this.dispatch({ type: 'resize', cols, rows })
	}

	private handleDrain(): void {
		this.needDrain = false
		this.stopDrainPoll()
		this.notifyDrain()
	}

	private notifyDrain(): void {
		for (const fn of this.drainListeners) fn()
	}

	private startDrainPoll(): void {
		if (this.drainPoll) return
		this.drainPoll = setInterval(() => {
			if ((this.output.writableLength ?? 0) > 0) return
			this.stopDrainPoll()
			if (!this.needDrain) this.notifyDrain()
		}, 4)
	}

	private stopDrainPoll(): void {
		if (this.drainPoll) {
			clearInterval(this.drainPoll)
			this.drainPoll = null
		}
	}

	private rawWrite(s: string): void {
		this.output.write(s)
		this.bytesWritten += s.length
		this.writeCount++
	}

	/**
	 * Writes a frame. If the stream could not take it all, `isBlocked()` turns true until the
	 * buffer drains; the app keeps rendering but skips flushes, then flushes once on `onDrain`.
	 */
	write(s: string): void {
		// Nothing the renderer draws belongs on the main screen (a frame rendered after stop()).
		if (s.length === 0 || !this.modesActive) return
		const ok = this.output.write(s)
		this.bytesWritten += s.length
		this.writeCount++
		if (!ok) {
			this.needDrain = true
		} else if ((this.output.writableLength ?? 0) > 0) {
			// Buffered below the high-water mark: no 'drain' event will follow, so poll instead.
			this.startDrainPoll()
		}
	}

	isBlocked(): boolean {
		return this.needDrain || (this.output.writableLength ?? 0) > 0
	}

	getSize(): { cols: number; rows: number } {
		return { cols: this.output.columns ?? 80, rows: this.output.rows ?? 24 }
	}

	getCapabilities(): TerminalCapabilities {
		return this.caps
	}

	isStarted(): boolean {
		return this.started
	}

	getStats(): { bytesWritten: number; writeCount: number } {
		return { bytesWritten: this.bytesWritten, writeCount: this.writeCount }
	}

	/** Shows the real cursor at a cell (IME placement and a blinking caret while editing text). */
	showCursorAt(col: number, row: number): void {
		if (!this.modesActive) return
		const cup = `\x1b[${(row | 0) + 1};${(col | 0) + 1}H`
		this.rawWrite(this.cursorVisible ? cup : cup + '\x1b[?25h')
		this.cursorVisible = true
	}

	hideCursor(): void {
		if (!this.cursorVisible || !this.modesActive) return
		this.rawWrite('\x1b[?25l')
		this.cursorVisible = false
	}

	/**
	 * Offers text to the terminal clipboard with OSC 52. False when the clipboard is unavailable or
	 * the text is too large for the sequence most terminals accept.
	 */
	copyToClipboard(text: string): boolean {
		if (!this.modesActive || !this.caps.osc52) return false
		const encoded = Buffer.from(text, 'utf8').toString('base64')
		if (encoded.length > OSC52_MAX_BASE64) return false
		this.rawWrite(`\x1b]52;c;${encoded}\x07`)
		return true
	}
}

// Terminals cap OSC 52 payloads; 64 KB of base64 is what kitty and xterm accept by default.
const OSC52_MAX_BASE64 = 65536

/** Blocks the thread for a few milliseconds without spinning (Atomics.wait is allowed on Node's main thread). */
function sleepSync(ms: number): void {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}
