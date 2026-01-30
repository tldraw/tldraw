import { track } from '@tldraw/state-react'
import { modulate } from '@tldraw/utils'
import { useEditor } from '../hooks/useEditor'
import { Geometry2d } from '../primitives/geometry/Geometry2d'
import { Group2d } from '../primitives/geometry/Group2d'

export const GeometryDebuggingView = track(function GeometryDebuggingView({
	showStroke = true,
	showVertices = true,
	showClosestPointOnOutline = true,
	showBounds = true,
	showPageBounds = true,
}: {
	showStroke?: boolean
	showVertices?: boolean
	showClosestPointOnOutline?: boolean
	showBounds?: boolean
	showPageBounds?: boolean
}) {
	const editor = useEditor()

	const zoomLevel = editor.getZoomLevel()
	const renderingShapes = editor.getRenderingShapes()
	const currentPagePoint = editor.inputs.getCurrentPagePoint()

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
				const pageBounds = editor.getShapePageBounds(shape)

				const pointInShapeSpace = editor.getPointInShapeSpace(shape, currentPagePoint)
				const nearestPointOnShape = geometry.nearestPoint(pointInShapeSpace)
				const distanceToPoint = geometry.distanceToPoint(pointInShapeSpace, true)
				const dist = Math.abs(distanceToPoint) * zoomLevel
				const hitInside = distanceToPoint < 0

				const { vertices } = geometry

				return (
					<g key={result.id + '_debug'}>
						{/* Page-space AABB (axis-aligned, used for hit testing/culling) */}
						{showPageBounds && pageBounds && (
							<rect
								x={pageBounds.x}
								y={pageBounds.y}
								width={pageBounds.w}
								height={pageBounds.h}
								fill="none"
								stroke="magenta"
								strokeWidth={1.5 / zoomLevel}
								strokeDasharray={`${6 / zoomLevel} ${3 / zoomLevel}`}
							/>
						)}
						<g transform={pageTransform.toCssString()} strokeLinecap="round" strokeLinejoin="round">
							{/* Local bounds (rotates with shape) */}
							{showVertices &&
								vertices.map((v, i) => (
									<circle
										key={`v${i}`}
										cx={v.x}
										cy={v.y}
										r={2 / zoomLevel}
										fill={`hsl(${modulate(i, [0, vertices.length - 1], [120, 200])}, 100%, 50%)`}
										stroke="black"
										strokeWidth={1 / zoomLevel}
									/>
								))}
							{showClosestPointOnOutline && dist < 150 && (
								<line
									x1={nearestPointOnShape.x}
									y1={nearestPointOnShape.y}
									x2={pointInShapeSpace.x}
									y2={pointInShapeSpace.y}
									opacity={1 - dist / 150}
									stroke={hitInside ? 'goldenrod' : 'dodgerblue'}
									strokeWidth={2 / zoomLevel}
								/>
							)}
						</g>
					</g>
				)
			})}
		</svg>
	)
})

function GeometryStroke({ geometry }: { geometry: Geometry2d }) {
	if (geometry instanceof Group2d) {
		return (
			<g stroke={geometry.debugColor}>
				{[...geometry.children, ...geometry.ignoredChildren].map((child, i) => (
					<GeometryStroke geometry={child} key={i} />
				))}
			</g>
		)
	}

	return <path d={geometry.toSimpleSvgPath()} stroke={geometry.debugColor} />
}
