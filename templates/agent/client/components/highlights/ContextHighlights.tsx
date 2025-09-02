import { TLShapeId, useEditor, useValue } from 'tldraw'
import { TldrawAgent } from '../../agent/TldrawAgent'
import { $contextItems } from '../../atoms/contextItems'
import { AreaHighlight, AreaHighlightProps } from './AreaHighlight'
import { PointHighlight, PointHighlightProps } from './PointHighlight'

export function ContextHighlights({ agent }: { agent: TldrawAgent }) {
	const editor = useEditor()
	const userContextItems = useValue($contextItems)
	const agentRequest = useValue(agent.$currentRequest)
	const agentContextItems = agentRequest?.contextItems ?? []

	const areaHighlights: AreaHighlightProps[] = useValue(
		'areaBounds',
		() => {
			const areaItems = userContextItems.filter((item) => item.type === 'area')
			return areaItems.map((item) => {
				return {
					pageBounds: item.bounds,
					generating: false,
					color: 'var(--tl-color-selected)',
				}
			})
		},
		[userContextItems]
	)

	const pendingAreaHighlights: AreaHighlightProps[] = useValue(
		'pendingAreaBounds',
		() => {
			const pendingAreaItems = agentContextItems.filter((item) => item.type === 'area')
			return pendingAreaItems.map((item) => {
				return {
					pageBounds: item.bounds,
					generating: true,
					color: 'var(--tl-color-selected)',
					label: item.source === 'agent' ? 'Reviewing' : undefined,
				}
			})
		},
		[agentContextItems]
	)

	const shapesHighlights: AreaHighlightProps[] = useValue(
		'shapesBounds',
		() => {
			const shapeItems = userContextItems.filter((item) => item.type === 'shapes')
			return shapeItems
				.map((item) => {
					const bounds = editor.getShapesPageBounds(
						item.shapes.map((shape) => `shape:${shape.shapeId}` as TLShapeId)
					)
					if (!bounds) return null
					return {
						pageBounds: bounds,
						generating: false,
						color: 'var(--tl-color-selected)',
					}
				})
				.filter((highlight) => highlight !== null)
		},
		[userContextItems]
	)

	const pendingShapesHighlights: AreaHighlightProps[] = useValue(
		'pendingShapesBounds',
		() => {
			const pendingShapeItems = agentContextItems.filter((item) => item.type === 'shapes')
			return pendingShapeItems
				.map((item) => {
					const bounds = editor.getShapesPageBounds(
						item.shapes.map((shape) => `shape:${shape.shapeId}` as TLShapeId)
					)
					if (!bounds) return null
					return {
						pageBounds: bounds,
						generating: true,
						color: 'var(--tl-color-selected)',
					}
				})
				.filter((highlight) => highlight !== null)
		},
		[agentContextItems]
	)

	const shapeHighlights: AreaHighlightProps[] = useValue(
		'shapeBounds',
		() => {
			const shapeItems = userContextItems.filter((item) => item.type === 'shape')
			return shapeItems
				.map((item) => {
					const bounds = editor.getShapePageBounds(`shape:${item.shape.shapeId}` as TLShapeId)
					if (!bounds) return null
					return {
						pageBounds: bounds,
						generating: false,
						color: 'var(--tl-color-selected)',
					}
				})
				.filter((highlight) => highlight !== null)
		},
		[userContextItems]
	)

	const pendingShapeHighlights: AreaHighlightProps[] = useValue(
		'pendingShapeBounds',
		() => {
			const pendingShapeItems = agentContextItems.filter((item) => item.type === 'shape')
			return pendingShapeItems
				.map((item) => {
					const bounds = editor.getShapePageBounds(`shape:${item.shape.shapeId}` as TLShapeId)
					if (!bounds) return null
					return {
						pageBounds: bounds,
						generating: true,
						color: 'var(--tl-color-selected)',
					}
				})
				.filter((highlight) => highlight !== null)
		},
		[agentContextItems]
	)

	const pointsHighlights: PointHighlightProps[] = useValue(
		'points',
		() => {
			const pointItems = userContextItems.filter((item) => item.type === 'point')
			return pointItems.map((item) => {
				return {
					pagePoint: item.point,
					generating: false,
					color: 'var(--tl-color-selected)',
				}
			})
		},
		[userContextItems]
	)

	const pendingPointsHighlights: PointHighlightProps[] = useValue(
		'pendingPoints',
		() => {
			const pendingPointItems = agentContextItems.filter((item) => item.type === 'point')
			return pendingPointItems.map((item) => {
				return {
					pagePoint: item.point,
					generating: true,
					color: 'var(--tl-color-selected)',
				}
			})
		},
		[agentContextItems]
	)

	const allAreaHighlights = useValue(
		'allAreaHighlights',
		() => [
			...areaHighlights,
			...shapesHighlights,
			...shapeHighlights,
			...pendingAreaHighlights,
			...pendingShapesHighlights,
			...pendingShapeHighlights,
		],
		[
			areaHighlights,
			shapesHighlights,
			shapeHighlights,
			pendingAreaHighlights,
			pendingShapesHighlights,
			pendingShapeHighlights,
		]
	)

	const allPointsHighlights = useValue(
		'allPointsHighlights',
		() => [...pointsHighlights, ...pendingPointsHighlights],
		[pointsHighlights, pendingPointsHighlights]
	)

	return (
		<>
			{allAreaHighlights.map((highlight, i) => (
				<AreaHighlight
					key={'context-highlight-' + i}
					pageBounds={highlight.pageBounds}
					color={highlight.color}
					generating={highlight.generating}
					label={highlight.label}
				/>
			))}

			{allPointsHighlights.map((highlight, i) => (
				<PointHighlight
					key={'context-point-' + i}
					pagePoint={highlight.pagePoint}
					color={highlight.color}
					generating={highlight.generating}
				/>
			))}
		</>
	)
}
