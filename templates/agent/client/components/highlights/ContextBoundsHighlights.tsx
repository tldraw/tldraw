import { atom, Box, BoxModel, useEditor, useValue } from 'tldraw'
import { AreaHighlight } from './AreaHighlight'

export const $contextBoundsHighlight = atom<BoxModel | null>('contextBoundsHighlight', null)

export function ContextBoundsHighlights() {
	const contextBounds = useValue('contextBounds', () => $contextBoundsHighlight.get(), [
		$contextBoundsHighlight,
	])

	const editor = useEditor()
	const screenBounds = useValue(
		'screenBounds',
		() => {
			if (!contextBounds) return null
			const expandedPageBounds = Box.From(contextBounds).expandBy(4)
			const screenCorners = expandedPageBounds.corners.map((corner) => {
				return editor.pageToViewport(corner)
			})
			return Box.FromPoints(screenCorners)
		},
		[contextBounds]
	)

	if (!contextBounds || !screenBounds) return null
	return (
		<>
			<AreaHighlight
				key="prompt-bounds-highlight"
				pageBounds={contextBounds}
				color="var(--tl-color-grid)"
				className="generating"
			/>
			{screenBounds && (
				<div
					className="agent-view-label"
					style={{
						top: `${screenBounds.y - 28}px`,
						left: `${screenBounds.x}px`,
					}}
				>
					Agent view 👁️👄👁️
					{/* <div style={{ display: 'flex', alignItems: 'center', gap: 0}}>
						<AgentIcon type="eye" />
						<AgentIcon type="eye" />
					</div> */}
				</div>
			)}
		</>
	)
}
