import { EventBus } from './EventBus'
import { EventName } from './types'

const STATUS_NOTE_ON = 0x90
const STATUS_NOTE_OFF = 0x80

/**
 * The thing a sequence talks to when it wants to make sound. Mirrors kaneel's
 * MIDIDelegate, but uses the Web MIDI API and carries a per-note channel so the
 * canvas can route different sequences to different instruments.
 */
export interface MidiDelegate {
	sendNoteOn(pitch: number, velocity: number, channel: number): void
	sendNoteOff(pitch: number, velocity: number, channel: number): void
}

/**
 * Web MIDI implementation of the delegate. Also re-dispatches NoteOn/NoteOff on
 * the bus under its own identity, like MIDIManager does in the C++ source, so
 * other parts of the graph can react to "real" output.
 */
export class MidiOutput implements MidiDelegate {
	private access: MIDIAccess | null = null
	private port: MIDIOutput | null = null

	constructor(private eventBus: EventBus) {
		this.eventBus.register(this)
	}

	get isSupported() {
		return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator
	}

	get hasAccess() {
		return !!this.access
	}

	async requestAccess(): Promise<MIDIOutput[]> {
		if (!this.isSupported) throw new Error('Web MIDI is not supported in this browser.')
		this.access = await navigator.requestMIDIAccess({ sysex: false })
		const outputs = this.listOutputs()
		// Default to the first available output, matching the C++ behaviour of
		// opening port 0.
		if (!this.port && outputs.length > 0) this.port = outputs[0]
		return outputs
	}

	// Notify when devices/ports are connected or disconnected.
	onStateChange(cb: () => void) {
		if (this.access) this.access.onstatechange = cb
	}

	listOutputs(): MIDIOutput[] {
		if (!this.access) return []
		return Array.from(this.access.outputs.values())
	}

	selectOutput(id: string | null) {
		if (!this.access || id === null) {
			this.port = null
			return
		}
		this.port = this.access.outputs.get(id) ?? null
	}

	get selectedOutputId() {
		return this.port?.id ?? null
	}

	private send(status: number, channel: number, data1: number, data2: number) {
		if (!this.port) return
		const clampedChannel = Math.max(0, Math.min(15, channel))
		try {
			this.port.send([status | clampedChannel, data1 & 0x7f, data2 & 0x7f])
		} catch {
			// The port may have just disconnected (e.g. an app closed). Ignore;
			// a rescan / reselect will restore output.
		}
	}

	sendNoteOn(pitch: number, velocity: number, channel: number) {
		this.send(STATUS_NOTE_ON, channel, pitch, velocity)
		this.eventBus.dispatchEvent(this, { name: EventName.NoteOn, data: pitch })
	}

	sendNoteOff(pitch: number, velocity: number, channel: number) {
		this.send(STATUS_NOTE_OFF, channel, pitch, velocity)
		this.eventBus.dispatchEvent(this, { name: EventName.NoteOff, data: pitch })
	}

	// Send a note-off on every channel/pitch. Used when the transport stops so
	// we never leave a hanging note.
	allNotesOff() {
		if (!this.port) return
		try {
			for (let channel = 0; channel < 16; channel++) {
				// CC 123 = All Notes Off.
				this.port.send([0xb0 | channel, 123, 0])
			}
		} catch {
			// Port may have disconnected; ignore.
		}
	}
}
