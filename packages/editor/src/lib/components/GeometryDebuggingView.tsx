import { track } from '@tldraw/state'
import { modulate } from '@tldraw/utils'
import { useEffect, useState } from 'react'
import { HIT_TEST_MARGIN } from '../constants'
import { useEditor } from '../hooks/useEditor'

function useTick(isEnabled = true) {
	const [_, setTick] = useState(0)
	const editor = useEditor()
	useEffect(() => {
		if (!isEnabled) return
		const update = () => setTick((tick) => tick + 1)
		editor.on('tick', update)
		return () => {
			editor.off('tick', update)
		}
	}, [editor, isEnabled])
}

export const GeometryDebuggingView = track(function GeometryDebuggingView({
	showStroke = true,
	showVertices = true,
	showClosestPointOnOutline = true,
}: {
	showStroke?: boolean
	showVertices?: boolean
	showClosestPointOnOutline?: boolean
}) {
	const editor = useEditor()
	useTick(showClosestPointOnOutline)

	const {
		zoomLevel,
		renderingShapes,
		inputs: { currentPagePoint },
	} = editor

	return (
		<svg
			style={{
				position: 'absolute',
				pointerEvents: 'none',
				zIndex: 999999999,
				top: 0,
				left: 0,
				overflow: 'visible',
			}}
		>
			{renderingShapes.map((result) => {
				const shape = editor.getShape(result.id)!

				if (shape.type === 'group') return null

				const geometry = editor.getShapeGeometry(shape)
				const pageTransform = editor.getShapePageTransform(shape)!

				const pointInShapeSpace = editor.getPointInShapeSpace(shape, currentPagePoint)
				const nearestPointOnShape = geometry.nearestPoint(pointInShapeSpace)
				const distanceToPoint = geometry.distanceToPoint(pointInShapeSpace)

				const { vertices } = geometry

				return (
					<g key={result.id + '_outline'} transform={pageTransform.toCssString()}>
						{showStroke && (
							<path
								stroke="red"
								strokeWidth={2}
								fill="none"
								opacity={0.5}
								d={geometry.toSimpleSvgPath()}
							/>
						)}
						{showVertices &&
							vertices.map((v, i) => (
								<circle
									key={`v${i}`}
									cx={v.x}
									cy={v.y}
									r={2}
									fill={`hsl(${modulate(i, [0, vertices.length - 1], [120, 0])}, 100%, 50%)`}
									stroke="black"
									strokeWidth="1"
								/>
							))}
						{distanceToPoint > 0 && showClosestPointOnOutline && (
							<line
								x1={nearestPointOnShape.x}
								y1={nearestPointOnShape.y}
								x2={pointInShapeSpace.x}
								y2={pointInShapeSpace.y}
								strokeWidth={2}
								stroke={distanceToPoint < HIT_TEST_MARGIN / zoomLevel ? 'red' : 'pink'}
							/>
						)}
					</g>
				)
			})}
		</svg>
	)
})
