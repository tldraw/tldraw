// A faithful port of the event model from kaneel/midiseq (C++).
// The whole engine talks through a small event bus that dispatches numeric
// payloads under a named event, scoped to the emitter's identity.

export enum EventName {
	NoteOn,
	NoteOff,
	MidiMessage,
	Tick,
	LoopWrap,
	TransportPlay,
	TransportPause,
	TransportStop,
}

export interface MidiEvent {
	name: EventName
	data: number
}

// Listeners receive the single numeric payload, exactly like the C++ version.
export type EventListener = (data: number) => void

// Pulses per quarter note. Matches the C++ sequencer (PPQ = 480).
export const PPQ = 480
export const QUARTER = PPQ
export const EIGHTH = QUARTER / 2
export const SIXTEENTH = QUARTER / 4

// A single note. Length is measured in ticks (decremented once per tick by the
// playback manager), matching kaneel's note.h.
export interface Note {
	pitch: number
	velocity: number
	length: number
	// Chance (0..1) the note fires on a given pass, and how many evenly-spaced
	// retriggers (ratchets) to play across its length.
	probability?: number
	ratchet?: number
}

export function makeNote(
	pitch = 63,
	velocity = 100,
	length = 90,
	probability = 1,
	ratchet = 1
): Note {
	return { pitch, velocity, length, probability, ratchet }
}
