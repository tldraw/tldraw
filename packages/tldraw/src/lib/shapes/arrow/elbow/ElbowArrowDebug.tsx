import { Box, TLArrowShape, useEditor, useValue, VecLike } from '@tldraw/editor'
import { SVGProps } from 'react'
import { getArrowBindings } from '../shared'
import { ElbowArrowEdge } from './definitions'
import { getElbowArrowInfo } from './getElbowArrowInfo'

export function ElbowArrowDebug({ arrow }: { arrow: TLArrowShape }) {
	const editor = useEditor()
	const info = useValue(
		'elbow arrow grid',
		() => {
			try {
				const info = getElbowArrowInfo(
					editor,
					editor.getShape(arrow.id)!,
					getArrowBindings(editor, arrow)
				)
				return info
			} catch (err) {
				console.error(err)
				return undefined
			}
		},
		[editor, arrow.id]
	)

	if (!info) return null

	const fullBox = Box.Common([info.A.original, info.B.original]).expandBy(50)

	const label = info.route?.name ?? ''

	const midPoint = info.route?.midpointHandle

	return (
		<>
			{info.midX !== null && (
				<DebugLine
					a={{ x: info.midX, y: fullBox.minY }}
					b={{ x: info.midX, y: fullBox.maxY }}
					stroke="red"
				/>
			)}
			{info.midY !== null && (
				<DebugLine
					a={{ x: fullBox.minX, y: info.midY }}
					b={{ x: fullBox.maxX, y: info.midY }}
					stroke="blue"
				/>
			)}

			{midPoint?.axis === 'x' && info.midXRange && (
				<DebugLine
					a={{ x: info.midXRange.lo, y: midPoint.point.y }}
					b={{ x: info.midXRange.hi, y: midPoint.point.y }}
					stroke="red"
					strokeDasharray={'0 2'}
				/>
			)}

			{midPoint?.axis === 'y' && info.midYRange && (
				<DebugLine
					a={{ x: midPoint.point.x, y: info.midYRange.lo }}
					b={{ x: midPoint.point.x, y: info.midYRange.hi }}
					stroke="blue"
					strokeDasharray={'0 2'}
				/>
			)}

			<DebugBox box={info.A.original} stroke="orange" />
			<DebugBox box={info.A.expanded} stroke="orange" strokeWidth={0.5} />
			<DebugBox
				box={info.A.original.clone().expandBy(info.options.minElbowLegLength)}
				stroke="orange"
				strokeWidth={0.5}
			/>
			<DebugBox box={info.B.original} stroke="lightskyblue" />
			<DebugBox box={info.B.expanded} stroke="lightskyblue" strokeWidth={0.5} />
			<DebugBox
				box={info.B.original.clone().expandBy(info.options.minElbowLegLength)}
				stroke="lightskyblue"
				strokeWidth={0.5}
			/>

			<DebugEdge edge={info.A.edges.top} axis="x" stroke="orange" />
			<DebugEdge edge={info.B.edges.top} axis="x" stroke="lightskyblue" />
			<DebugEdge edge={info.A.edges.right} axis="y" stroke="orange" />
			<DebugEdge edge={info.B.edges.right} axis="y" stroke="lightskyblue" />
			<DebugEdge edge={info.A.edges.bottom} axis="x" stroke="orange" />
			<DebugEdge edge={info.B.edges.bottom} axis="x" stroke="lightskyblue" />
			<DebugEdge edge={info.A.edges.left} axis="y" stroke="orange" />
			<DebugEdge edge={info.B.edges.left} axis="y" stroke="lightskyblue" />

			{info.route && <DebugRoute route={info.route.points} strokeWidth={10} />}

			<text
				x={fullBox.minX + 5}
				y={fullBox.minY - 3}
				fontSize={10}
				fill="black"
				stroke="var(--tl-color-background)"
				strokeWidth={2}
				paintOrder="stroke"
			>
				{label}
			</text>
			<text
				x={info.A.expanded.x}
				y={info.A.expanded.y}
				fontSize={10}
				fill="black"
				stroke="var(--tl-color-background)"
				strokeWidth={2}
				paintOrder="stroke"
			>
				A{info.route && `, ${info.route.aEdgePicking}`}
				{info.A.isPoint && `, point`}
			</text>
			<text
				x={info.B.expanded.x}
				y={info.B.expanded.y}
				fontSize={10}
				fill="black"
				stroke="var(--tl-color-background)"
				strokeWidth={2}
				paintOrder="stroke"
			>
				B{info.route && `, ${info.route.bEdgePicking}`}
				{info.B.isPoint && `, point`}
			</text>
		</>
	)
}

function DebugLine({ a, b, ...props }: { a: VecLike; b: VecLike } & SVGProps<SVGLineElement>) {
	return (
		<line
			fill="none"
			strokeWidth={1}
			strokeDasharray="4,4"
			stroke="green"
			x1={a.x}
			y1={a.y}
			x2={b.x}
			y2={b.y}
			{...props}
		/>
	)
}

function DebugRoute({ route, ...props }: { route: VecLike[] } & SVGProps<SVGPolylineElement>) {
	return (
		<polyline
			fill="none"
			stroke="darkorchid"
			strokeWidth={3}
			opacity={0.5}
			points={route.map((r) => `${r.x},${r.y}`).join(' ')}
			{...props}
		/>
	)
}

function DebugEdge({
	edge,
	axis,
	...props
}: {
	edge: ElbowArrowEdge | null
	axis: 'x' | 'y'
} & Omit<SVGProps<SVGLineElement>, 'scale'>) {
	if (!edge || edge.expanded === null) return null
	const vec = (vec: VecLike) => (axis === 'x' ? { x: vec.y, y: vec.x } : vec)

	return (
		<g>
			<DebugLine
				a={vec({ x: edge.expanded, y: edge.cross.min })}
				b={vec({ x: edge.expanded, y: edge.cross.max })}
				strokeDasharray="0"
				strokeWidth={1.5}
				{...props}
			/>
			<DebugLine
				a={vec({ x: edge.expanded - 4, y: edge.cross.min })}
				b={vec({ x: edge.expanded + 4, y: edge.cross.min })}
				strokeDasharray="0"
				strokeWidth={1.5}
				{...props}
			/>
			<DebugLine
				a={vec({ x: edge.expanded - 4, y: edge.cross.max })}
				b={vec({ x: edge.expanded + 4, y: edge.cross.max })}
				strokeDasharray="0"
				strokeWidth={1.5}
				{...props}
			/>
		</g>
	)
}

function DebugBox({ box, ...props }: { box: Box } & SVGProps<SVGRectElement>) {
	return (
		<rect
			x={box.minX}
			y={box.minY}
			width={box.width}
			height={box.height}
			strokeDasharray="4,4"
			strokeWidth={1}
			fill="none"
			{...props}
		/>
	)
}
