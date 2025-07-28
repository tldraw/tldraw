import { atom, Box, useValue } from 'tldraw'
import { AreaHighlight } from './AreaHighlight'

export const $contextBoundsHighlight = atom<Box | null>('contextBoundsHighlight', null)

export function ContextBoundsHighlights() {
	const contextBounds = useValue('contextBounds', () => $contextBoundsHighlight.get(), [])
	if (!contextBounds) return null
	return (
		<AreaHighlight
			key="prompt-bounds-highlight"
			pageBounds={contextBounds}
			color="var(--color-grid)"
			className="generating"
		/>
	)
}
