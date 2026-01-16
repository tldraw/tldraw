import { useMemo } from 'react'
import { TLShapeId, useEditor, useValue } from 'tldraw'
import { useAgent } from '../../agent/TldrawAgentAppProvider'
import { AreaHighlight, AreaHighlightProps } from './AreaHighlight'
import { PointHighlight, PointHighlightProps } from './PointHighlight'

export function ContextHighlights() {
	const agent = useAgent()
	const editor = useEditor()
	const contextItems = useValue('contextItems', () => agent.context.getItems(), [agent])
	const isGenerating = useValue('isGenerating', () => agent.requests.isGenerating(), [agent])

	// Area highlights
	const areaHighlights: AreaHighlightProps[] = useValue(
		'areaHighlights',
		() => {
			const areaItems = contextItems.filter((item) => item.type === 'area')
			return areaItems.map((item) => ({
				pageBounds: item.bounds,
				generating: isGenerating,
				color: 'var(--tl-color-selected)',
				label: isGenerating && item.source === 'agent' ? 'Reviewing' : undefined,
			}))
		},
		[contextItems, isGenerating]
	)

	// Multiple shapes highlights (type: 'shapes')
	const shapesHighlights: AreaHighlightProps[] = useValue(
		'shapesHighlights',
		() => {
			const shapesItems = contextItems.filter((item) => item.type === 'shapes')
			return shapesItems
				.map((item) => {
					const bounds = editor.getShapesPageBounds(
						item.shapes.map((shape) => `shape:${shape.shapeId}` as TLShapeId)
					)
					if (!bounds) return null
					return {
						pageBounds: bounds,
						generating: isGenerating,
						color: 'var(--tl-color-selected)',
					}
				})
				.filter((highlight) => highlight !== null)
		},
		[contextItems, isGenerating, editor]
	)

	// Single shape highlights (type: 'shape')
	const shapeHighlights: AreaHighlightProps[] = useValue(
		'shapeHighlights',
		() => {
			const shapeItems = contextItems.filter((item) => item.type === 'shape')
			return shapeItems
				.map((item) => {
					const bounds = editor.getShapePageBounds(`shape:${item.shape.shapeId}` as TLShapeId)
					if (!bounds) return null
					return {
						pageBounds: bounds,
						generating: isGenerating,
						color: 'var(--tl-color-selected)',
					}
				})
				.filter((highlight) => highlight !== null)
		},
		[contextItems, isGenerating, editor]
	)

	// Point highlights
	const pointHighlights: PointHighlightProps[] = useValue(
		'pointHighlights',
		() => {
			const pointItems = contextItems.filter((item) => item.type === 'point')
			return pointItems.map((item) => ({
				pagePoint: item.point,
				generating: isGenerating,
				color: 'var(--tl-color-selected)',
			}))
		},
		[contextItems, isGenerating]
	)

	const allAreaHighlights = useMemo(
		() => [...areaHighlights, ...shapesHighlights, ...shapeHighlights],
		[areaHighlights, shapesHighlights, shapeHighlights]
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

			{pointHighlights.map((highlight, i) => (
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
