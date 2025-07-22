import { Box, SVGContainer, useEditor, useValue, Vec } from 'tldraw'
import { $contextItems, $pendingContextItems } from './Context'

export function ContextHighlights() {
	const editor = useEditor()
	const contextItems = useValue('contextItems', () => $contextItems.get(), [])
	const pendingContextItems = useValue('pendingContextItems', () => $pendingContextItems.get(), [
		$pendingContextItems,
	])
	const areaItems = useValue(
		'areaContextItems',
		() => contextItems.filter((item) => item.type === 'area'),
		[contextItems]
	)
	const pendingAreaItems = useValue(
		'pendingAreaContextItems',
		() => pendingContextItems.filter((item) => item.type === 'area'),
		[pendingContextItems]
	)
	const shapeItems = useValue(
		'shapeContextItems',
		() => contextItems.filter((item) => item.type === 'shape'),
		[contextItems]
	)
	const pendingShapeItems = useValue(
		'pendingShapeContextItems',
		() => pendingContextItems.filter((item) => item.type === 'shape'),
		[pendingContextItems]
	)
	const pointItems = useValue(
		'pointContextItems',
		() => contextItems.filter((item) => item.type === 'point'),
		[contextItems]
	)
	const pendingPointItems = useValue(
		'pendingPointContextItems',
		() => pendingContextItems.filter((item) => item.type === 'point'),
		[pendingContextItems]
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

	const points = useValue(
		'points',
		() => pointItems.map((item) => editor.pageToScreen(item.point)),
		[pointItems, editor]
	)

	const pendingPoints = useValue(
		'pendingPoints',
		() => pendingPointItems.map((item) => editor.pageToScreen(item.point)),
		[pendingPointItems, editor]
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
			{points.map((item, i) => (
				<ContextPoint key={'context-point-' + i} point={item} color="var(--color-selected)" />
			))}
			{pendingPoints.map((item, i) => (
				<ContextPoint
					key={'context-point-' + i}
					point={item}
					color="var(--color-selected)"
					className="generating"
				/>
			))}
		</>
	)
}

function ContextPoint({
	point,
	color,
	className,
}: {
	point: Vec
	color?: string
	className?: string
}) {
	const r = 3
	return (
		<SVGContainer
			className={`context-point ${className}`}
			style={{
				top: point.y - r,
				left: point.x - r,
				width: r * 2,
				height: r * 2,
			}}
		>
			<circle
				cx={r}
				cy={r}
				r={r}
				stroke={color ? color : 'var(--color-selected)'}
				fill={color ? color : 'var(--color-selected)'}
			/>
		</SVGContainer>
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
