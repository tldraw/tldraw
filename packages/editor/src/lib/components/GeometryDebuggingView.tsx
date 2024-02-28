import { track } from '@tldraw/state'
import { modulate } from '@tldraw/utils'
import { useEditor } from '../hooks/useEditor'
import { Vec } from '../primitives/Vec'
import { Geometry2d } from '../primitives/geometry/Geometry2d'
import { Group2d } from '../primitives/geometry/Group2d'

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

	const zoomLevel = editor.getZoomLevel()
	const renderingShapes = editor.getRenderingShapes()
	const controls = editor.getControls()
	const {
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
				const distanceToPoint = geometry.distanceToPoint(pointInShapeSpace, true)
				const dist = Math.abs(distanceToPoint) * zoomLevel
				const hitInside = distanceToPoint < 0

				const { vertices } = geometry

				return (
					<g
						key={result.id + '_outline'}
						transform={pageTransform.toCssString()}
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						{showStroke && <GeometryStroke geometry={geometry} zoomLevel={zoomLevel} />}
						{showVertices &&
							vertices.map((v, i) => (
								<circle
									key={`v${i}`}
									cx={v.x}
									cy={v.y}
									r={2 / zoomLevel}
									fill={`hsl(${modulate(i, [0, vertices.length - 1], [120, 200])}, 100%, 50%)`}
									stroke="black"
									strokeWidth={0.5 / zoomLevel}
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
				)
			})}

			{controls.map((control, i) => {
				const geometry = control.getGeometry()

				const nearestPointOnControl = geometry.nearestPoint(currentPagePoint)
				const distanceToPoint = Vec.Dist(nearestPointOnControl, currentPagePoint)
				const dist = distanceToPoint * zoomLevel
				const hitInside = distanceToPoint < 0

				const { vertices } = geometry

				return (
					<g key={i} strokeLinecap="round" strokeLinejoin="round">
						{showStroke && (
							<GeometryStroke geometry={geometry} defaultColor="teal" zoomLevel={zoomLevel} />
						)}
						{showVertices &&
							vertices.map((v, i) => (
								<circle
									key={`v${i}`}
									cx={v.x}
									cy={v.y}
									r={2 / zoomLevel}
									fill={`hsl(${modulate(i, [0, vertices.length - 1], [120, 200])}, 100%, 50%)`}
									stroke="black"
									strokeWidth={0.5 / zoomLevel}
								/>
							))}
						{showClosestPointOnOutline && dist < 150 && (
							<line
								x1={nearestPointOnControl.x}
								y1={nearestPointOnControl.y}
								x2={currentPagePoint.x}
								y2={currentPagePoint.y}
								opacity={1 - dist / 150}
								stroke={hitInside ? 'goldenrod' : 'dodgerblue'}
								strokeWidth={2 / zoomLevel}
							/>
						)}
					</g>
				)
			})}
		</svg>
	)
})

function GeometryStroke({
	geometry,
	defaultColor = 'red',
	zoomLevel,
}: {
	geometry: Geometry2d
	defaultColor?: string
	zoomLevel: number
}) {
	if (geometry instanceof Group2d) {
		return (
			<>
				{[...geometry.children, ...geometry.ignoredChildren].map((child, i) => (
					<GeometryStroke
						key={i}
						geometry={child}
						defaultColor={defaultColor}
						zoomLevel={zoomLevel}
					/>
				))}
			</>
		)
	}

	return (
		<path
			stroke={geometry.debugColor ?? defaultColor}
			strokeWidth={2 / zoomLevel}
			fill="none"
			opacity="1"
			d={geometry.toSimpleSvgPath()}
		/>
	)
}
