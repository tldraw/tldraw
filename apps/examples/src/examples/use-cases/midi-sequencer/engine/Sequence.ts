import { EventBus, EventBusDelegate } from './EventBus'
import { MidiDelegate } from './MidiOutput'
import { PlaybackManager } from './PlaybackManager'
import { EventListener, EventName, Note } from './types'

export enum PlayAction {
	None,
	LoopIteration,
	Bar,
}

export enum NextAction {
	None,
	Next,
	Previous,
	First,
	Last,
}

export enum TrigMode {
	AdvanceByOne,
	AdvanceByStep,
	AdvanceToNextNote,
	Restart,
	FireCurrent,
}

/**
 * A single playable pattern. Port of kaneel's Sequence: notes live in a map
 * keyed by tick position, a playhead is advanced by an external clock pulse
 * (`trig`) according to the trig mode, and notes are fired through the MIDI
 * delegate with note-offs scheduled by the playback manager.
 */
export class Sequence {
	private startTick = 0
	private lengthTicks = 0
	private playhead = 0
	private notes = new Map<number, Note[]>()
	private active = false
	private muted = false
	private looping = false
	private loopRange: [number, number] = [0, 0]
	private stepper = 480
	private channel = 0

	private playAction = PlayAction.None
	private nextAction = NextAction.None
	private nextTiming = 0

	private clockEmitter: EventBusDelegate | null = null
	private clockEvent: EventName = EventName.Tick
	private clockHandle = 0
	private trigMode: TrigMode = TrigMode.AdvanceByOne
	// Guards against synchronous feedback loops, e.g. a sequence that is a chain
	// member and is also clocked by that chain's note events.
	private isTriggering = false
	// Step-based trig modes act once every `pulsesPerStep` clock pulses, so a
	// high-resolution clock (the master tick) is subdivided down to the step
	// rate. For sparse event clocks this is 1 (each event is one step).
	private pulsesPerStep = 1
	private pulseCounter = 0

	constructor(
		private eventBus: EventBus,
		private delegate: MidiDelegate,
		private playbackManager: PlaybackManager,
		public readonly id: number
	) {
		this.eventBus.register(this)
	}

	get length() {
		return this.lengthTicks
	}
	get playheadPosition() {
		return this.playhead
	}
	get isActive() {
		return this.active
	}
	get currentChannel() {
		return this.channel
	}
	get playActionValue() {
		return this.playAction
	}
	get nextActionValue() {
		return this.nextAction
	}
	get nextTimingValue() {
		return this.nextTiming
	}

	setLength(length: number) {
		this.lengthTicks = length
	}
	setStart(startTick: number) {
		this.startTick = startTick
	}
	setLoopRange(start: number, end: number) {
		this.loopRange = [start, end]
	}
	setStepper(ticks: number) {
		this.stepper = ticks
	}
	setChannel(channel: number) {
		this.channel = channel
	}
	// Muted sequences keep advancing (staying in sync) but produce no sound.
	setMuted(muted: boolean) {
		this.muted = muted
	}
	setTrigMode(mode: TrigMode) {
		this.trigMode = mode
	}
	// How many clock pulses make up one step (e.g. `stepper` ticks for the
	// master clock, or 1 for a per-event clock).
	setPulsesPerStep(pulses: number) {
		this.pulsesPerStep = Math.max(1, Math.floor(pulses))
	}
	loop(enabled: boolean) {
		this.looping = enabled
	}

	setNextAction(action: NextAction, playAction: PlayAction, timing: number) {
		this.nextAction = action
		this.playAction = playAction
		this.nextTiming = timing
	}

	play() {
		this.active = true
	}
	stop() {
		this.active = false
	}
	pause() {
		this.active = false
	}

	resetPlayhead() {
		this.playhead = this.loopRange[0]
		this.pulseCounter = 0
	}

	// Start playing from the loop start and immediately fire whatever sits on
	// the first step, so the downbeat sounds right away instead of only after
	// the first loop wrap.
	restart() {
		this.playhead = this.loopRange[0]
		this.pulseCounter = 0
		this.active = true
		this.fireNotesAtPlayhead()
	}

	clearNotes() {
		this.notes.clear()
	}

	addNote(position: number, note: Note) {
		const existing = this.notes.get(position)
		if (existing) {
			existing.push(note)
			return
		}
		this.notes.set(position, [note])
	}

	setClockSource(emitter: EventBusDelegate, event: EventName) {
		this.clearClockSource()
		this.clockEmitter = emitter
		this.clockEvent = event
		this.clockHandle = this.eventBus.addListener(emitter, event, () => this.trig())
	}

	clearClockSource() {
		if (this.clockEmitter && this.clockHandle) {
			this.eventBus.removeListener(this.clockEmitter, this.clockEvent, this.clockHandle)
		}
		this.clockEmitter = null
		this.clockHandle = 0
	}

	addListener(event: EventName, listener: EventListener) {
		return this.eventBus.addListener(this, event, listener)
	}
	removeListener(event: EventName, id: number) {
		this.eventBus.removeListener(this, event, id)
	}

	// One pulse from the bound clock source.
	trig() {
		if (!this.active) return
		// If firing a note re-enters trig() (a feedback cycle through the event
		// bus), ignore the nested call rather than recursing forever.
		if (this.isTriggering) return
		this.isTriggering = true
		try {
			// "Advance by one" glides per pulse; the other modes step, so they only
			// act once per step-duration (subdividing a high-resolution clock).
			if (this.trigMode !== TrigMode.AdvanceByOne) {
				if (++this.pulseCounter < this.pulsesPerStep) return
				this.pulseCounter = 0
			}
			this.trigInner()
		} finally {
			this.isTriggering = false
		}
	}

	private trigInner() {
		let target = this.playhead
		switch (this.trigMode) {
			case TrigMode.AdvanceByOne:
				target = this.playhead + 1
				break
			case TrigMode.AdvanceByStep:
				target = this.playhead + this.stepper
				break
			case TrigMode.AdvanceToNextNote: {
				const next = this.firstNoteAfter(this.playhead)
				if (next === null) {
					if (!this.looping || this.notes.size === 0) return
					target = this.firstNotePosition()!
				} else {
					target = next
				}
				break
			}
			case TrigMode.Restart:
				target = this.loopRange[0]
				break
			case TrigMode.FireCurrent:
				break
		}

		this.advanceTo(target)
	}

	private firstNoteAfter(position: number): number | null {
		let best: number | null = null
		for (const key of this.notes.keys()) {
			if (key > position && (best === null || key < best)) best = key
		}
		return best
	}

	private firstNotePosition(): number | null {
		let best: number | null = null
		for (const key of this.notes.keys()) {
			if (best === null || key < best) best = key
		}
		return best
	}

	private advanceTo(target: number) {
		let wrapped = false
		if (this.looping && target >= this.loopRange[1]) {
			const span = this.loopRange[1] - this.loopRange[0]
			target =
				span > 0 ? this.loopRange[0] + ((target - this.loopRange[0]) % span) : this.loopRange[0]
			wrapped = true
		}

		this.playhead = target
		this.fireNotesAtPlayhead()

		if (wrapped) {
			this.eventBus.dispatchEvent(this, { name: EventName.LoopWrap, data: this.id })
		}
	}

	private fireNotesAtPlayhead() {
		if (this.muted) return
		const notes = this.notes.get(this.playhead)
		if (!notes) return

		for (const note of notes) {
			// Probability: skip the whole note (and its ratchets) on a failed roll.
			const probability = note.probability ?? 1
			if (probability < 1 && Math.random() >= probability) continue

			const ratchet = Math.max(1, Math.min(8, note.ratchet ?? 1))
			const sub = Math.max(1, Math.floor(note.length / ratchet))

			// One ratchet hit: a short note of length `sub`, cutting any previous
			// hit on the same pitch/channel so rolls retrigger cleanly.
			const hit = () => {
				const h: Note = { pitch: note.pitch, velocity: note.velocity, length: sub }
				this.playbackManager.findAndCut(h, this.channel)
				this.delegate.sendNoteOn(h.pitch, h.velocity, this.channel)
				this.eventBus.dispatchEvent(this, { name: EventName.NoteOn, data: h.pitch })
				this.playbackManager.assignPlayback(h, this.channel, (expired) => {
					this.delegate.sendNoteOff(expired.pitch, expired.velocity, this.channel)
					this.eventBus.dispatchEvent(this, { name: EventName.NoteOff, data: expired.pitch })
				})
			}

			hit()
			for (let i = 1; i < ratchet; i++) {
				this.playbackManager.schedule(i * sub, hit)
			}
		}
	}

	dispose() {
		this.clearClockSource()
		this.eventBus.unregister(this)
	}
}
