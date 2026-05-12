import { atom } from 'tldraw'

export type EtchInteraction = 'knob-left' | 'knob-right' | 'body' | 'resize'

// Stylus and path coordinates are normalized 0–1 across the screen rectangle so
// resizing the device doesn't distort the drawing.
export interface NormPoint {
	x: number
	y: number
}

const INITIAL_STYLUS: NormPoint = { x: 0.5, y: 0.5 }

export const stylus$ = atom<NormPoint>('etch:stylus', INITIAL_STYLUS)
export const path$ = atom<NormPoint[]>('etch:path', [INITIAL_STYLUS])
export const leftAngle$ = atom<number>('etch:leftAngle', 0)
export const rightAngle$ = atom<number>('etch:rightAngle', 0)

export const activeInteraction$ = atom<EtchInteraction | null>('etch:activeInteraction', null)

// Device size in screen pixels — the device stays a fixed screen size regardless
// of editor zoom. Aspect ratio is preserved across resizes.
export interface DeviceSize {
	w: number
	h: number
}
export const DEFAULT_DEVICE_SIZE: DeviceSize = { w: 720, h: 540 }
export const MIN_DEVICE_W = 360
export const MAX_DEVICE_W = 1600
export const ASPECT = DEFAULT_DEVICE_SIZE.w / DEFAULT_DEVICE_SIZE.h

export const deviceSize$ = atom<DeviceSize>('etch:deviceSize', DEFAULT_DEVICE_SIZE)

// Page-space position of the device's top-left corner. `null` means the device
// is anchored to the top-center of the current viewport — the default until the
// user grabs and moves it.
export const devicePos$ = atom<{ x: number; y: number } | null>('etch:devicePos', null)

export function clearEtch() {
	path$.set([stylus$.get()])
}
