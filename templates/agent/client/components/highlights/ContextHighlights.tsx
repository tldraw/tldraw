import { useMemo } from 'react'
import { TLShapeId, useEditor, useValue } from 'tldraw'
import { TldrawAgent } from '../../agent/TldrawAgent'
import { useAgents } from '../../agent/TldrawAgentAppProvider'
import { AreaHighlight, AreaHighlightProps } from './AreaHighlight'
import { PointHighlight, PointHighlightProps } from './PointHighlight'

/**
 * Renders context highlights for all agents.
 */
export function AllContextHighlights() {
	const agents = useAgents()

	return (
		<>
			{agents.map((agent) => (
				<ContextHighlights key={agent.id} agent={agent} />
			))}
		</>
	)
}

/**
 * Renders context highlights for a single agent.
 */
export function ContextHighlights({ agent }: { agent: TldrawAgent }) {
	const editor = useEditor()
	const selectedContextItems = useValue(
		'contextItems',
		() => (agent.requests.isGenerating() ? [] : agent.context.getItems()),
		[agent]
	)
	const activeRequest = useValue('activeRequest', () => agent.requests.getActiveRequest(), [agent])
	const activeContextItems = activeRequest?.contextItems ?? []

	const selectedAreas: AreaHighlightProps[] = useValue(
		'selectedAreas',
		() => {
			const selectedAreaItems = selectedContextItems.filter((item) => item.type === 'area')
			return selectedAreaItems.map((item) => {
				return {
					pageBounds: item.bounds,
					generating: false,
					color: 'var(--tl-color-selected)',
				}
			})
		},
		[selectedContextItems]
	)

	const activeAreas: AreaHighlightProps[] = useValue(
		'activeAreas',
		() => {
			const activeAreaItems = activeContextItems.filter((item) => item.type === 'area')
			return activeAreaItems.map((item) => {
				return {
					pageBounds: item.bounds,
					generating: true,
					color: 'var(--tl-color-selected)',
					label: item.source === 'agent' ? 'Reviewing' : undefined,
				}
			})
		},
		[activeContextItems]
	)

	const selectedShapes: AreaHighlightProps[] = useValue(
		'selectedShapes',
		() => {
			const selectedShapeItems = selectedContextItems.filter((item) => item.type === 'shapes')
			return selectedShapeItems
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
		[selectedContextItems, editor]
	)

	const activeShapes: AreaHighlightProps[] = useValue(
		'activeShapes',
		() => {
			const activeShapeItems = activeContextItems.filter((item) => item.type === 'shapes')
			return activeShapeItems
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
		[activeContextItems, editor]
	)

	const selectedShapesAreas: AreaHighlightProps[] = useValue(
		'selectedShapesAreas',
		() => {
			const selectedShapeItems = selectedContextItems.filter((item) => item.type === 'shape')
			return selectedShapeItems
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
		[selectedContextItems, editor]
	)

	const activeShapeAreas: AreaHighlightProps[] = useValue(
		'activeShapeAreas',
		() => {
			const activeShapeItems = activeContextItems.filter((item) => item.type === 'shape')
			return activeShapeItems
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
		[activeContextItems, editor]
	)

	const selectedPoints: PointHighlightProps[] = useValue(
		'selectedPoints',
		() => {
			const selectedPointItems = selectedContextItems.filter((item) => item.type === 'point')
			return selectedPointItems.map((item) => {
				return {
					pagePoint: item.point,
					generating: false,
					color: 'var(--tl-color-selected)',
				}
			})
		},
		[selectedContextItems]
	)

	const activePoints: PointHighlightProps[] = useValue(
		'activePoints',
		() => {
			const activePointItems = activeContextItems.filter((item) => item.type === 'point')
			return activePointItems.map((item) => {
				return {
					pagePoint: item.point,
					generating: true,
					color: 'var(--tl-color-selected)',
				}
			})
		},
		[activeContextItems]
	)

	const allAreaHighlights = useMemo(
		() => [
			...selectedAreas,
			...selectedShapes,
			...selectedShapesAreas,
			...activeAreas,
			...activeShapes,
			...activeShapeAreas,
		],
		[
			selectedAreas,
			selectedShapes,
			selectedShapesAreas,
			activeAreas,
			activeShapes,
			activeShapeAreas,
		]
	)

	const allPointsHighlights = useMemo(
		() => [...selectedPoints, ...activePoints],
		[selectedPoints, activePoints]
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
