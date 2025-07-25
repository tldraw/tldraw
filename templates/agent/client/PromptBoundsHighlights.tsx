import { useEffect } from 'react'
import { Box, SVGContainer, useEditor, useValue } from 'tldraw'
import { $promptBounds } from './PromptBounds'

export function PromptBoundsHighlights() {
	const editor = useEditor()
	const promptBounds = useValue('promptBounds', () => $promptBounds.get(), [$promptBounds])

	// Convert page coordinates to screen coordinates
	const screenPromptBounds = useValue(
		'screenPromptBounds',
		() => {
			if (!promptBounds) return null
			const screenCorners = promptBounds.corners.map((corner) => editor.pageToScreen(corner))
			return Box.FromPoints(screenCorners)
		},
		[promptBounds, editor]
	)

	if (!screenPromptBounds) return null

	return (
		<>
			<PromptBoundsHighlight
				key="prompt-bounds-highlight"
				screenBounds={screenPromptBounds}
				color="red"
				className="generating"
			/>
		</>
	)
}

function PromptBoundsHighlight({
	screenBounds,
	color,
	className,
}: {
	screenBounds: Box
	color?: string
	className?: string
}) {
	useEffect(() => {
		console.log('screenBounds', screenBounds)
	}, [screenBounds])

	const minX = screenBounds.minX
	const minY = screenBounds.minY
	const maxX = screenBounds.maxX
	const maxY = screenBounds.maxY

	return (
		<SVGContainer
			className={`context-highlight ${className}`}
			style={{
				top: minY,
				left: minX,
				width: maxX - minX,
				height: maxY - minY,
			}}
		>
			{screenBounds.sides.map((side, j) => {
				return (
					<line
						key={'context-highlight-side-' + j}
						x1={side[0].x - screenBounds.minX}
						y1={side[0].y - screenBounds.minY}
						x2={side[1].x - screenBounds.minX}
						y2={side[1].y - screenBounds.minY}
						stroke={color ? color : 'var(--color-selected)'}
					/>
				)
			})}
		</SVGContainer>
	)
}
