import { Atom, atom, Editor } from 'tldraw'
import { Chain } from './Chain'
import { EventBus } from './EventBus'
import { MidiDelegate, MidiOutput } from './MidiOutput'
import { PlaybackManager } from './PlaybackManager'
import { NextAction, PlayAction, Sequence, TrigMode } from './Sequence'
import { Sequencer } from './Sequencer'
import { EventName, makeNote } from './types'

export interface NoteCell {
	step: number
	pitch: number
	velocity: number
	length: number
	probability?: number
	ratchet?: number
}

export type ClockEvent = 'tick' | 'noteOn' | 'noteOff'

export interface SequenceConfig {
	channel: number
	steps: number
	stepper: number
	trigMode: TrigMode
	enabled: boolean
	solo: boolean
	notes: NoteCell[]
	nextAction: NextAction
	nextAfterLoops: number
	// '' / the clock => sequencer tick; otherwise a chain shape id + its event.
	clockSourceId: string
	clockEvent: ClockEvent
}

export interface ChainConfig {
	sequenceIds: string[]
}

interface TransportState {
	playing: boolean
	bpm: number
}

interface MidiState {
	supported: boolean
	enabled: boolean
	outputs: { id: string; name: string }[]
	selectedId: string | null
}

function nowMicros() {
	return performance.now() * 1000
}

/**
 * Orchestrates the ported engine and bridges it to tldraw's reactive store.
 * Shape props are the source of truth for configuration; this class mirrors
 * them into live Sequence/Chain objects and publishes transient runtime state
 * (playheads, active sequence, transport) through @tldraw/state atoms so the
 * shapes can render reactively. It also acts as the MidiDelegate, sending notes
 * to the selected Web MIDI output (e.g. the macOS IAC Driver into GarageBand).
 */
export class MidiEngine implements MidiDelegate {
	readonly eventBus = new EventBus()
	readonly sequencer = new Sequencer(this.eventBus)
	readonly playbackManager = new PlaybackManager()
	readonly midiOutput = new MidiOutput(this.eventBus)

	private sequences = new Map<string, Sequence>()
	private sequenceConfigs = new Map<string, SequenceConfig>()
	private chains = new Map<string, Chain>()
	private chainConfigs = new Map<string, ChainConfig>()
	private sequenceToChain = new Map<string, string>()
	private nextId = 1

	readonly playheads: Atom<Record<string, number>> = atom('midi:playheads', {})
	readonly activeChainIndex: Atom<Record<string, number>> = atom('midi:activeChain', {})
	readonly transport: Atom<TransportState> = atom('midi:transport', { playing: false, bpm: 120 })
	readonly midi: Atom<MidiState> = atom('midi:state', {
		supported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
		enabled: false,
		outputs: [],
		selectedId: null,
	})

	private raf = 0
	private disposed = false

	constructor() {
		this.eventBus.addListener(this.sequencer, EventName.Tick, () =>
			this.playbackManager.pollPlaybacks()
		)
		const cut = () => {
			this.playbackManager.cutAll()
			this.midiOutput.allNotesOff()
		}
		this.eventBus.addListener(this.sequencer, EventName.TransportStop, cut)
		this.eventBus.addListener(this.sequencer, EventName.TransportPause, cut)
		this.loop()
	}

	private loop() {
		if (this.disposed) return
		// Never let an error (e.g. sending to a port that just disconnected) kill
		// the clock — always reschedule the next frame.
		try {
			this.sequencer.run(nowMicros())
			this.publishRuntimeState()
		} catch (err) {
			console.error('[midi] clock loop error', err)
		}
		this.raf = requestAnimationFrame(() => this.loop())
	}

	private publishRuntimeState() {
		if (!this.sequencer.isPlaying) return
		const next: Record<string, number> = {}
		for (const [id, seq] of this.sequences) next[id] = seq.playheadPosition
		this.playheads.set(next)

		const activeNext: Record<string, number> = {}
		for (const [id, chain] of this.chains) activeNext[id] = chain.activeSequenceIndex
		this.activeChainIndex.set(activeNext)
	}

	// --- MidiDelegate (output routing) --------------------------------------

	sendNoteOn(pitch: number, velocity: number, channel: number) {
		this.midiOutput.sendNoteOn(pitch, velocity, channel)
	}

	sendNoteOff(pitch: number, velocity: number, channel: number) {
		this.midiOutput.sendNoteOff(pitch, velocity, channel)
	}

	// --- transport -----------------------------------------------------------

	setBpm(bpm: number) {
		this.sequencer.setBPM(bpm)
		this.transport.update((t) => ({ ...t, bpm }))
	}

	togglePlay() {
		if (this.sequencer.isPlaying) this.stop()
		else this.play()
	}

	play() {
		this.recomputeMutes()
		this.sequencer.play(nowMicros())
		// Standalone sequences all start; mute/solo decides what's audible.
		for (const [id, seq] of this.sequences) {
			if (this.sequenceToChain.has(id)) continue
			seq.restart()
		}
		for (const chain of this.chains.values()) {
			if (chain.size > 0) chain.setActiveSequence(0)
		}
		this.transport.update((t) => ({ ...t, playing: true }))
	}

	// Mute = not enabled. Solo = if any sequence is soloed, only soloed ones sound.
	private recomputeMutes() {
		let anySolo = false
		for (const cfg of this.sequenceConfigs.values()) {
			if (cfg.solo) {
				anySolo = true
				break
			}
		}
		for (const [id, seq] of this.sequences) {
			const cfg = this.sequenceConfigs.get(id)
			if (!cfg) continue
			seq.setMuted(anySolo ? !cfg.solo : !cfg.enabled)
		}
	}

	stop() {
		this.sequencer.stop()
		for (const seq of this.sequences.values()) {
			seq.stop()
			seq.resetPlayhead()
		}
		for (const chain of this.chains.values()) chain.stop()
		this.playbackManager.cutAll()
		this.midiOutput.allNotesOff()
		const cleared: Record<string, number> = {}
		for (const id of this.sequences.keys()) cleared[id] = 0
		this.playheads.set(cleared)
		this.activeChainIndex.set({})
		this.transport.update((t) => ({ ...t, playing: false }))
	}

	// --- midi output ---------------------------------------------------------

	async enableMidi() {
		try {
			await this.midiOutput.requestAccess()
			this.midiOutput.onStateChange(() => this.refreshOutputs())
			this.midi.update((m) => ({ ...m, enabled: true }))
			this.refreshOutputs()
		} catch {
			this.midi.update((m) => ({ ...m, supported: this.midiOutput.isSupported, enabled: false }))
		}
	}

	// Re-request MIDI access and re-read the available output ports. Useful after
	// closing/reopening an app like GarageBand, whose virtual port disappears and
	// comes back (possibly with a new id).
	async rescanMidi() {
		await this.enableMidi()
	}

	private refreshOutputs() {
		const outputs = this.midiOutput.listOutputs().map((o) => ({ id: o.id, name: o.name ?? o.id }))
		// Keep the current selection if still present, else fall back to the
		// first available output (e.g. the IAC Driver into GarageBand).
		let selectedId = this.midi.get().selectedId
		if (!selectedId || !outputs.some((o) => o.id === selectedId)) {
			selectedId = outputs[0]?.id ?? null
		}
		if (selectedId) this.midiOutput.selectOutput(selectedId)
		this.midi.update((m) => ({ ...m, outputs, selectedId }))
	}

	selectOutput(id: string) {
		this.midiOutput.selectOutput(id || null)
		this.midi.update((m) => ({ ...m, selectedId: id || null }))
	}

	// --- sequence reconciliation --------------------------------------------

	upsertSequence(id: string, config: SequenceConfig) {
		let seq = this.sequences.get(id)
		if (!seq) {
			seq = new Sequence(this.eventBus, this, this.playbackManager, this.nextId++)
			this.sequences.set(id, seq)
		}
		this.sequenceConfigs.set(id, config)
		this.applySequenceConfig(seq, config)
		this.refreshClockSources()
		this.recomputeMutes()

		if (this.sequencer.isPlaying && !this.sequenceToChain.has(id)) {
			seq.play()
		}
	}

	private applySequenceConfig(seq: Sequence, config: SequenceConfig) {
		const totalTicks = config.steps * config.stepper
		seq.setStepper(config.stepper)
		seq.setLength(totalTicks)
		seq.setLoopRange(0, totalTicks)
		seq.loop(true)
		seq.setChannel(config.channel)
		seq.setTrigMode(config.trigMode)
		seq.setNextAction(config.nextAction, PlayAction.LoopIteration, config.nextAfterLoops)

		seq.clearNotes()
		for (const cell of config.notes) {
			seq.addNote(
				cell.step * config.stepper,
				makeNote(cell.pitch, cell.velocity, cell.length, cell.probability, cell.ratchet)
			)
		}
	}

	removeSequence(id: string) {
		const seq = this.sequences.get(id)
		if (!seq) return
		for (const chain of this.chains.values()) chain.removeSequence(seq)
		seq.dispose()
		this.sequences.delete(id)
		this.sequenceConfigs.delete(id)
		this.sequenceToChain.delete(id)
		this.refreshClockSources()
		this.recomputeMutes()
	}

	// Bind every sequence's clock to its configured source: the master clock
	// (tick), or the note events of another chain or sequence. Faithful to
	// kaneel's SetClockSource.
	private refreshClockSources() {
		for (const [id, seq] of this.sequences) {
			const cfg = this.sequenceConfigs.get(id)
			if (!cfg) continue
			if (cfg.clockEvent === 'tick') {
				// Subdivide the master tick down to the step rate.
				seq.setPulsesPerStep(cfg.stepper)
				seq.setClockSource(this.sequencer, EventName.Tick)
				continue
			}
			// The emitter can be a chain or another sequence. Each sparse event is
			// a single step.
			seq.setPulsesPerStep(1)
			const emitter = this.chains.get(cfg.clockSourceId) ?? this.sequences.get(cfg.clockSourceId)
			if (emitter && emitter !== seq) {
				seq.setClockSource(
					emitter,
					cfg.clockEvent === 'noteOn' ? EventName.NoteOn : EventName.NoteOff
				)
			} else {
				seq.clearClockSource()
			}
		}
	}

	getSequencePlayhead(id: string) {
		return this.playheads.get()[id] ?? 0
	}

	// --- chain reconciliation -----------------------------------------------

	upsertChain(id: string, config: ChainConfig) {
		this.chainConfigs.set(id, config)
		let chain = this.chains.get(id)
		if (!chain) {
			chain = new Chain(this.eventBus, this.nextId++)
			this.chains.set(id, chain)
		}
		const members = config.sequenceIds
			.map((sid) => this.sequences.get(sid))
			.filter((s): s is Sequence => !!s)
		chain.setMembers(members)
		this.recomputeSequenceToChain()
		this.refreshClockSources()

		if (this.sequencer.isPlaying && chain.size > 0 && chain.activeSequenceIndex === -1) {
			chain.setActiveSequence(0)
		}
	}

	removeChain(id: string) {
		const chain = this.chains.get(id)
		if (chain) {
			chain.dispose()
			this.chains.delete(id)
		}
		this.chainConfigs.delete(id)
		this.recomputeSequenceToChain()
		this.refreshClockSources()
	}

	private recomputeSequenceToChain() {
		this.sequenceToChain.clear()
		for (const [chainId, config] of this.chainConfigs) {
			for (const seqId of config.sequenceIds) {
				this.sequenceToChain.set(seqId, chainId)
			}
		}
	}

	getActiveChainIndex(id: string) {
		return this.activeChainIndex.get()[id] ?? -1
	}

	// Tear down all sequences/chains. Used before rebuilding from a loaded song.
	clear() {
		this.stop()
		for (const chain of this.chains.values()) chain.dispose()
		for (const seq of this.sequences.values()) seq.dispose()
		this.chains.clear()
		this.sequences.clear()
		this.chainConfigs.clear()
		this.sequenceConfigs.clear()
		this.sequenceToChain.clear()
		this.playheads.set({})
		this.activeChainIndex.set({})
	}

	dispose(editor: Editor) {
		this.disposed = true
		cancelAnimationFrame(this.raf)
		this.stop()
		for (const chain of this.chains.values()) chain.dispose()
		for (const seq of this.sequences.values()) seq.dispose()
		this.chains.clear()
		this.sequences.clear()
		MidiEngine.instances.delete(editor)
	}

	private static instances = new WeakMap<Editor, MidiEngine>()

	static get(editor: Editor): MidiEngine {
		let engine = MidiEngine.instances.get(editor)
		if (!engine) {
			engine = new MidiEngine()
			MidiEngine.instances.set(editor, engine)
			editor.disposables.add(() => engine!.dispose(editor))
		}
		return engine
	}
}
