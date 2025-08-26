import { atom, BoxModel, useValue } from 'tldraw'
import { AreaHighlight } from './AreaHighlight'

export const $contextBoundsHighlight = atom<BoxModel | null>('contextBoundsHighlight', null)

export function ContextBoundsHighlights() {
	const contextBounds = useValue('contextBounds', () => $contextBoundsHighlight.get(), [
		$contextBoundsHighlight,
	])

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
