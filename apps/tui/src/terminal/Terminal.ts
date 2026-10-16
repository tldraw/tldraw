import { writeSync } from 'node:fs'
import { ColorMode, Rgb } from './colors'
import { EventSink, InputParser, InputParserOptions, TerminalEvent } from './InputParser'
import {
	ambiguousWideFromCpr,
	backgroundFromColorFgBg,
	defaultOsc52,
	isGnuScreen,
	isUtf8Locale,
	KITTY_FLAGS,
	parseOsc11Color,
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
	private caps: TerminalCapabilities
	private started = false
	private modesActive = false
	private listening = false
	private kittyPushed = false
	private mokEnabled = false
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
		this.onDrainBound = () => this.onDrain()
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
	async start(): Promise<TerminalCapabilities> {
		if (this.started) return this.caps
		if (!this.opts.assumeTTY) {
			if (!this.output.isTTY) {
				throw new Error('tldraw-tui needs an interactive terminal: stdout is not a TTY')
			}
			if (!this.input.isTTY) {
				throw new Error('tldraw-tui needs an interactive terminal: stdin is not a TTY')
			}
		}
		this.enterModes()
		if (this.opts.probe !== false) await this.runProbe()
		this.finishCapabilities()
		this.enableKeyboardProtocol()
		if (this.opts.processHandlers) this.installProcessHandlers()
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
			const timer = setTimeout(() => done(), this.opts.probeTimeoutMs ?? PROBE_TIMEOUT_MS)
			const done = () => {
				if (settled) return
				settled = true
				clearTimeout(timer)
				this.probeResolve = null
				// Erase the probe glyph; the first paint would cover it but may be a second away.
				this.rawWrite('\x1b[1;1H \x1b[H')
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
		if (!this.modesActive) return
		this.modesActive = false
		this.started = false
		if (write) {
			let seq = '\x1b[?2026l'
			if (this.kittyPushed) seq += '\x1b[<u'
			if (this.mokEnabled) seq += '\x1b[>4m'
			seq += '\x1b[?1003l\x1b[?1002l\x1b[?1000l\x1b[?1006l'
			seq += '\x1b[?2004l\x1b[?1004l\x1b[?1007h'
			seq += '\x1b[0m\x1b[?25h\x1b[?7h\x1b[?1049l'
			this.writeRestore(seq)
		}
		this.kittyPushed = false
		this.mokEnabled = false
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

	private writeRestore(seq: string): void {
		const fd = this.output.fd
		if (typeof fd === 'number') {
			try {
				writeSync(fd, seq)
				return
			} catch {
				// Fall through to the stream write.
			}
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
			this.stop()
			process.exit(130)
		})
		add('SIGTERM', () => {
			this.stop()
			process.exit(143)
		})
		add('SIGHUP', () => {
			// The controlling terminal is gone; writing to it would only raise EIO.
			this.restore(false)
			process.exit(129)
		})
		const crash = (err: unknown) => {
			this.stop()
			const text = err instanceof Error ? (err.stack ?? err.message) : String(err)
			process.stderr.write(text + '\n')
			process.exit(1)
		}
		add('uncaughtException', crash)
		add('unhandledRejection', crash)
		add('SIGCONT', () => {
			// Resumed after an external SIGTSTP: the shell left the terminal in cooked mode on the
			// main screen, so re-enter everything and ask the app for a full repaint.
			this.enterModes()
			this.enableKeyboardProtocol()
			this.started = true
			for (const fn of this.resumeListeners) fn()
		})
	}

	onEvent(fn: EventSink): () => void {
		this.listeners.push(fn)
		return () => {
			const i = this.listeners.indexOf(fn)
			if (i >= 0) this.listeners.splice(i, 1)
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
		for (const fn of this.listeners) fn(e)
	}

	private onData(chunk: Uint8Array): void {
		this.parser.feed(chunk, this.dispatchBound)
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

	private onDrain(): void {
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
		if (s.length === 0) return
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
		const cup = `\x1b[${(row | 0) + 1};${(col | 0) + 1}H`
		this.rawWrite(this.cursorVisible ? cup : cup + '\x1b[?25h')
		this.cursorVisible = true
	}

	hideCursor(): void {
		if (!this.cursorVisible) return
		this.rawWrite('\x1b[?25l')
		this.cursorVisible = false
	}
}
