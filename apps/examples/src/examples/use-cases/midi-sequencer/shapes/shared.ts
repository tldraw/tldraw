import { NextAction, TrigMode } from '../engine/Sequence'
import { SIXTEENTH } from '../engine/types'

export const SEQUENCE_TYPE = 'midi-sequence'
export const CHAIN_TYPE = 'midi-chain'

// Grid layout. Two octaves, rendered with the highest pitch at the top.
export const PITCH_LOW = 48 // C3
export const PITCH_COUNT = 24

export const HEADER_HEIGHT = 30
export const FOOTER_HEIGHT = 104
export const LABEL_WIDTH = 30

export const DEFAULT_STEPS = 16
export const DEFAULT_STEPPER = SIXTEENTH

export const CELL_WIDTH = 20
export const CELL_HEIGHT = 9

export const DEFAULT_SEQUENCE_WIDTH = LABEL_WIDTH + DEFAULT_STEPS * CELL_WIDTH
export const DEFAULT_SEQUENCE_HEIGHT = HEADER_HEIGHT + PITCH_COUNT * CELL_HEIGHT + FOOTER_HEIGHT

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const ROOT_OPTIONS = NOTE_NAMES.map((name, i) => ({ value: i, label: name }))

// Scale lock: semitone offsets from the root. 'chromatic' means no snapping.
export type ScaleId =
	| 'chromatic'
	| 'major'
	| 'minor'
	| 'dorian'
	| 'mixolydian'
	| 'pentatonicMajor'
	| 'pentatonicMinor'
	| 'harmonicMinor'

export const SCALES: Record<ScaleId, number[]> = {
	chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
	major: [0, 2, 4, 5, 7, 9, 11],
	minor: [0, 2, 3, 5, 7, 8, 10],
	dorian: [0, 2, 3, 5, 7, 9, 10],
	mixolydian: [0, 2, 4, 5, 7, 9, 10],
	pentatonicMajor: [0, 2, 4, 7, 9],
	pentatonicMinor: [0, 3, 5, 7, 10],
	harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
}

export const SCALE_OPTIONS: { id: ScaleId; label: string }[] = [
	{ id: 'chromatic', label: 'chromatic' },
	{ id: 'major', label: 'major' },
	{ id: 'minor', label: 'minor' },
	{ id: 'dorian', label: 'dorian' },
	{ id: 'mixolydian', label: 'mixolydian' },
	{ id: 'pentatonicMajor', label: 'major pentatonic' },
	{ id: 'pentatonicMinor', label: 'minor pentatonic' },
	{ id: 'harmonicMinor', label: 'harmonic minor' },
]

export function isInScale(pitch: number, root: number, scale: ScaleId) {
	const degree = (((pitch - root) % 12) + 12) % 12
	return SCALES[scale].includes(degree)
}

// Snap a pitch to the nearest pitch that belongs to the scale.
export function snapToScale(pitch: number, root: number, scale: ScaleId) {
	if (scale === 'chromatic' || isInScale(pitch, root, scale)) return pitch
	for (let d = 1; d <= 6; d++) {
		if (isInScale(pitch - d, root, scale)) return pitch - d
		if (isInScale(pitch + d, root, scale)) return pitch + d
	}
	return pitch
}

// Evenly distribute `pulses` hits across `steps` (Euclidean rhythm).
export function euclid(pulses: number, steps: number): boolean[] {
	const out: boolean[] = []
	const p = Math.max(0, Math.min(steps, Math.round(pulses)))
	let bucket = 0
	for (let i = 0; i < steps; i++) {
		bucket += p
		if (bucket >= steps) {
			bucket -= steps
			out.push(true)
		} else {
			out.push(false)
		}
	}
	return out
}

export function pitchName(pitch: number) {
	const name = NOTE_NAMES[pitch % 12]
	const octave = Math.floor(pitch / 12) - 1
	return `${name}${octave}`
}

export function isBlackKey(pitch: number) {
	return NOTE_NAMES[pitch % 12].includes('#')
}

// Row 0 is the top (highest pitch). Convert between the visual row and the MIDI
// pitch number.
export function rowToPitch(row: number) {
	return PITCH_LOW + (PITCH_COUNT - 1 - row)
}
export function pitchToRow(pitch: number) {
	return PITCH_COUNT - 1 - (pitch - PITCH_LOW)
}

export type TrigModeId = 'one' | 'step' | 'nextNote' | 'restart'

export const TRIG_MODE_OPTIONS: { id: TrigModeId; label: string }[] = [
	{ id: 'one', label: 'Advance by one' },
	{ id: 'step', label: 'Advance by step' },
	{ id: 'nextNote', label: 'Advance to next note' },
	{ id: 'restart', label: 'Restart' },
]

export function toTrigMode(id: TrigModeId): TrigMode {
	switch (id) {
		case 'step':
			return TrigMode.AdvanceByStep
		case 'nextNote':
			return TrigMode.AdvanceToNextNote
		case 'restart':
			return TrigMode.Restart
		case 'one':
		default:
			return TrigMode.AdvanceByOne
	}
}

export type NextActionId = 'next' | 'previous' | 'first' | 'last'

export const NEXT_ACTION_OPTIONS: { id: NextActionId; label: string }[] = [
	{ id: 'next', label: 'next' },
	{ id: 'previous', label: 'previous' },
	{ id: 'first', label: 'first' },
	{ id: 'last', label: 'last' },
]

export function toNextAction(id: NextActionId): NextAction {
	switch (id) {
		case 'previous':
			return NextAction.Previous
		case 'first':
			return NextAction.First
		case 'last':
			return NextAction.Last
		case 'next':
		default:
			return NextAction.Next
	}
}

export const CLOCK_EVENT_OPTIONS: { id: 'tick' | 'noteOn' | 'noteOff'; label: string }[] = [
	{ id: 'tick', label: 'Clock (tick)' },
	{ id: 'noteOff', label: 'note off' },
	{ id: 'noteOn', label: 'note on' },
]

// Step resolution: how many ticks one grid step (column) lasts.
export const STEP_RESOLUTION_OPTIONS: { ticks: number; label: string }[] = [
	{ ticks: 480, label: '1/4' },
	{ ticks: 240, label: '1/8' },
	{ ticks: 120, label: '1/16' },
	{ ticks: 60, label: '1/32' },
]
