import { atom, Box } from 'tldraw'

export const $promptBounds = atom<Box | null>('promptBounds', null)
export const $contextBounds = atom<Box | null>('contextBounds', null)

export function setPromptBounds(bounds?: Box) {
	$promptBounds.set(bounds ?? null)
}

export function setContextBounds(bounds?: Box) {
	$contextBounds.set(bounds ?? null)
}
