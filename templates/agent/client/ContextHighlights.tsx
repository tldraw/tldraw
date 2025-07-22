import { Box, SVGContainer, useEditor, useValue } from 'tldraw'
import { $contextItems, $pendingContextItems } from './Context'

export function ContextHighlights() {
	const editor = useEditor()
	const contextItems = useValue('contextItems', () => $contextItems.get(), [])
	const areaItems = useValue(
		'areaContextItems',
		() => contextItems.filter((item) => item.type === 'area'),
		[contextItems]
	)
	const pendingAreaItems = useValue(
		'pendingAreaContextItems',
		() => $pendingContextItems.get().filter((item) => item.type === 'area'),
		[$pendingContextItems]
	)
	const shapeItems = useValue(
		'shapeContextItems',
		() => contextItems.filter((item) => item.type === 'shape'),
		[contextItems]
	)
	const pendingShapeItems = useValue(
		'pendingShapeContextItems',
		() => $pendingContextItems.get().filter((item) => item.type === 'shape'),
		[$pendingContextItems]
	)

	const areaBounds = useValue(
		'screenSpaceAreaBounds',
		() => {
			return areaItems.map((item) => {
				const pageBounds = new Box(item.bounds.x, item.bounds.y, item.bounds.w, item.bounds.h)
				const screenCorners = pageBounds.corners.map((corner) => editor.pageToScreen(corner))
				return Box.FromPoints(screenCorners)
			})
		},
		[areaItems, editor]
	)

	const pendingAreaBounds = useValue(
		'pendingScreenSpaceAreaBounds',
		() => {
			return pendingAreaItems.map((item) => {
				const pageBounds = new Box(item.bounds.x, item.bounds.y, item.bounds.w, item.bounds.h)
				const screenCorners = pageBounds.corners.map((corner) => editor.pageToScreen(corner))
				return Box.FromPoints(screenCorners)
			})
		},
		[pendingAreaItems, editor]
	)

	const shapeBounds = useValue(
		'screenSpaceShapeBounds',
		() => {
			return shapeItems
				.map((item) => {
					const pageBounds = editor.getShapePageBounds(item.shape)
					if (!pageBounds) return null
					const screenCorners = pageBounds.corners.map((corner) => editor.pageToScreen(corner))
					return Box.FromPoints(screenCorners)
				})
				.filter((item) => item !== null)
		},
		[shapeItems, editor]
	)

	const pendingShapeBounds = useValue(
		'pendingScreenSpaceShapeBounds',
		() => {
			return pendingShapeItems
				.map((item) => {
					const pageBounds = editor.getShapePageBounds(item.shape)
					if (!pageBounds) return null
					const screenCorners = pageBounds.corners.map((corner) => editor.pageToScreen(corner))
					return Box.FromPoints(screenCorners)
				})
				.filter((item) => item !== null)
		},
		[pendingShapeItems, editor]
	)

	return (
		<>
			{areaBounds.map((item, i) => (
				<ContextHighlight
					key={'context-highlight-' + i}
					screenBounds={item}
					color="var(--color-grid)"
				/>
			))}
			{shapeBounds.map((item, i) => (
				<ContextHighlight
					key={'context-highlight-' + i}
					screenBounds={item}
					color="var(--color-selected)"
				/>
			))}
			{pendingAreaBounds.map((item, i) => (
				<ContextHighlight
					key={'context-highlight-' + i}
					screenBounds={item}
					color="var(--color-grid)"
					className="generating"
				/>
			))}
			{pendingShapeBounds.map((item, i) => (
				<ContextHighlight
					key={'context-highlight-' + i}
					screenBounds={item}
					color="var(--color-selected)"
					className="generating"
				/>
			))}
		</>
	)
}

function ContextHighlight({
	screenBounds,
	color,
	className,
}: {
	screenBounds: Box
	color?: string
	className?: string
}) {
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
				pointerEvents: 'none',
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
