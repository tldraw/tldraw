import { useEditor, useValue } from 'tldraw'
import { $contextItems, $pendingContextItems } from '../contextItems'
import { AreaHighlight } from './AreaHighlight'
import { PointHighlight } from './PointHighlight'

export function ContextHighlights() {
	const editor = useEditor()
	const contextItems = useValue('contextItems', () => $contextItems.get(), [])
	const pendingContextItems = useValue('pendingContextItems', () => $pendingContextItems.get(), [])

	const areaBounds = useValue(
		'screenSpaceAreaBounds',
		() => {
			const areaItems = contextItems.filter((item) => item.type === 'area')
			return areaItems.map((item) => item.bounds).filter((item) => item !== null)
		},
		[contextItems]
	)

	const pendingAreaBounds = useValue(
		'pendingScreenSpaceAreaBounds',
		() => {
			const pendingAreaItems = pendingContextItems.filter((item) => item.type === 'area')
			return pendingAreaItems.map((item) => item.bounds).filter((item) => item !== null)
		},
		[pendingContextItems]
	)

	const shapeBounds = useValue(
		'screenSpaceShapeBounds',
		() => {
			const shapeItems = contextItems.filter((item) => item.type === 'shape')
			return shapeItems
				.map((item) => editor.getShapePageBounds(item.shape))
				.filter((item) => item !== undefined)
		},
		[contextItems]
	)

	const pendingShapeBounds = useValue(
		'pendingScreenSpaceShapeBounds',
		() => {
			const pendingShapeItems = pendingContextItems.filter((item) => item.type === 'shape')
			return pendingShapeItems
				.map((item) => editor.getShapePageBounds(item.shape))
				.filter((item) => item !== undefined)
		},
		[pendingContextItems]
	)

	const points = useValue(
		'points',
		() => {
			const pointItems = contextItems.filter((item) => item.type === 'point')
			return pointItems.map((item) => item.point)
		},
		[contextItems]
	)

	const pendingPoints = useValue(
		'pendingPoints',
		() => {
			const pendingPointItems = pendingContextItems.filter((item) => item.type === 'point')
			return pendingPointItems.map((item) => item.point)
		},
		[pendingContextItems]
	)

	return (
		<>
			{areaBounds.map((item, i) => (
				<AreaHighlight
					key={'context-highlight-' + i}
					pageBounds={item}
					color="var(--color-selected)"
				/>
			))}
			{shapeBounds.map((item, i) => (
				<AreaHighlight
					key={'context-highlight-' + i}
					pageBounds={item}
					color="var(--color-selected)"
				/>
			))}
			{pendingAreaBounds.map((item, i) => (
				<AreaHighlight
					key={'context-highlight-' + i}
					pageBounds={item}
					color="var(--color-selected)"
					className="generating"
				/>
			))}
			{pendingShapeBounds.map((item, i) => (
				<AreaHighlight
					key={'context-highlight-' + i}
					pageBounds={item}
					color="var(--color-selected)"
					className="generating"
				/>
			))}
			{points.map((item, i) => (
				<PointHighlight key={'context-point-' + i} pagePoint={item} color="var(--color-selected)" />
			))}
			{pendingPoints.map((item, i) => (
				<PointHighlight
					key={'context-point-' + i}
					pagePoint={item}
					color="var(--color-selected)"
					className="generating"
				/>
			))}
		</>
	)
}
