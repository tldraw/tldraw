import { VecModel, atom } from 'tldraw'

export interface TapePoint {
	x: number
	y: number
}

export interface TapeStroke {
	origin: TapePoint
	points: VecModel[]
}

// Trailing indicator position, in page coordinates. Lerped toward the leader
// each tick by the controller component.
export const anchor$ = atom<TapePoint | null>('tape.anchor', null)

// While the user holds space we record the anchor's path here, relative to the
// stroke origin. Setting this back to null on key-up clears the live preview.
export const tapeStroke$ = atom<TapeStroke | null>('tape.stroke', null)
