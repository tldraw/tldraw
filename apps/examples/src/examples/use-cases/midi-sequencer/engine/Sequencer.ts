import { EventBus } from './EventBus'
import { EventName, PPQ } from './types'

function microsPerTick(bpm: number) {
	return 60_000_000 / bpm / PPQ
}

/**
 * The master clock / transport. Port of kaneel's Sequencer: `run(now)` is
 * called with a microsecond timestamp and emits as many Tick events as have
 * elapsed since the last call, so the tempo is decoupled from the frame rate.
 */
export class Sequencer {
	private bpm = 120
	private lastTick = 0
	private microsPerTick = microsPerTick(120)
	private positionTick = 0
	private playing = false
	private loopRange: [number, number] = [0, 0]
	private loopEnabled = false

	constructor(private eventBus: EventBus) {
		this.eventBus.register(this)
	}

	get isPlaying() {
		return this.playing
	}

	get bpmValue() {
		return this.bpm
	}

	get position() {
		return this.positionTick
	}

	setBPM(bpm: number) {
		if (bpm <= 0) return
		this.bpm = bpm
		this.microsPerTick = microsPerTick(bpm)
	}

	setLoop(start: number, end: number) {
		this.loopRange = [start, end]
	}

	loop(enabled: boolean) {
		this.loopEnabled = enabled
	}

	play(now: number) {
		this.lastTick = now
		this.playing = true
		this.eventBus.dispatchEvent(this, { name: EventName.TransportPlay, data: 0 })
	}

	pause() {
		this.playing = false
		this.eventBus.dispatchEvent(this, { name: EventName.TransportPause, data: 0 })
	}

	stop() {
		this.playing = false
		this.positionTick = 0
		this.eventBus.dispatchEvent(this, { name: EventName.TransportStop, data: 0 })
	}

	run(now: number) {
		if (!this.playing) {
			this.lastTick = now
			return
		}

		let delta = now - this.lastTick
		const step = this.microsPerTick
		if (delta < step) return

		// If we fell badly behind (tab inactive, GC, a breakpoint), don't fire a
		// flood of catch-up ticks all at once — that bunches notes and desyncs
		// everything. Just resync the clock and carry on.
		if (delta > 200_000) {
			this.lastTick = now
			return
		}

		while (delta >= step) {
			delta -= step
			this.eventBus.dispatchEvent(this, { name: EventName.Tick, data: this.positionTick++ })

			if (this.loopEnabled && this.positionTick >= this.loopRange[1]) {
				this.positionTick = this.loopRange[0]
			}
		}

		this.lastTick = now - delta
	}
}
