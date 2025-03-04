import { assert, Box, TLArrowShape, useEditor, useValue, VecLike } from '@tldraw/editor'
import { SVGProps } from 'react'
import {
	ElbowArrowEdge,
	ElbowArrowScale,
	getElbowArrowInfo,
	transformPoint,
} from './getElbowArrowInfo'

export function ElbowArrowDebug({ arrow }: { arrow: TLArrowShape }) {
	assert(arrow.props.elbow)
	const editor = useEditor()
	const info = useValue(
		'elbow arrow grid',
		() => {
			try {
				const info = getElbowArrowInfo(editor, arrow.id)
				return info
			} catch (err) {
				console.error(err)
				return undefined
			}
		},
		[editor, arrow.id]
	)

	if (!info) return null

	const fullBox = Box.Common([info.original.A, info.original.B]).expandBy(50)
	const gizmoX = info.scale.x === 1 ? fullBox.minX : fullBox.maxX
	const gizmoY = info.scale.y === 1 ? fullBox.minY : fullBox.maxY

	const label = [info.hPos, info.vPos, info.route?.name].filter(Boolean).join(', ')

	return (
		<>
			{/* <DebugBox box={transformBox(info.expanded.A, info.scale)} stroke="orange" /> */}
			{/* <DebugBox box={transformBox(info.expanded.B, info.scale)} stroke="lightskyblue" /> */}
			{info.mx !== null && (
				<DebugLine
					a={{ x: info.mx * info.scale.x, y: fullBox.minY }}
					b={{ x: info.mx * info.scale.x, y: fullBox.maxY }}
					stroke="red"
				/>
			)}
			{info.my !== null && (
				<DebugLine
					a={{ x: fullBox.minX, y: info.my * info.scale.y }}
					b={{ x: fullBox.maxX, y: info.my * info.scale.y }}
					stroke="blue"
				/>
			)}
			<text x={fullBox.minX + 5} y={fullBox.minY + 13}>
				{label}
			</text>
			<g transform={`translate(${gizmoX}, ${gizmoY}) scale(${info.scale.x}, ${info.scale.y})`}>
				<line x1={0} y1={0} x2={30} y2={0} stroke="red" />
				<line x1={0} y1={0} x2={0} y2={30} stroke="blue" />
			</g>
			<DebugEdge edge={info.edges.A.top} axis="x" scale={info.scale} stroke="orange" />
			<DebugEdge edge={info.edges.B.top} axis="x" scale={info.scale} stroke="lightskyblue" />
			<DebugEdge edge={info.edges.A.right} axis="y" scale={info.scale} stroke="orange" />
			<DebugEdge edge={info.edges.B.right} axis="y" scale={info.scale} stroke="lightskyblue" />
			<DebugEdge edge={info.edges.A.bottom} axis="x" scale={info.scale} stroke="orange" />
			<DebugEdge edge={info.edges.B.bottom} axis="x" scale={info.scale} stroke="lightskyblue" />
			<DebugEdge edge={info.edges.A.left} axis="y" scale={info.scale} stroke="orange" />
			<DebugEdge edge={info.edges.B.left} axis="y" scale={info.scale} stroke="lightskyblue" />

			{info.route && <DebugRoute route={info.route.path} />}
			{/* {info.path && <DebugRoute route={info.path} />} */}
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
			points={route.map((r) => `${r.x},${r.y}`).join(' ')}
			{...props}
		/>
	)
}

function DebugEdge({
	edge,
	axis,
	scale,
	...props
}: {
	edge: ElbowArrowEdge | null
	axis: 'x' | 'y'
	scale: ElbowArrowScale
} & Omit<SVGProps<SVGLineElement>, 'scale'>) {
	if (!edge) return null
	const vec = (vec: VecLike) => transformPoint(axis === 'x' ? { x: vec.y, y: vec.x } : vec, scale)

	return (
		<g>
			<DebugLine
				a={vec({ x: edge.expanded, y: edge.cross.min })}
				b={vec({ x: edge.expanded, y: edge.cross.max })}
				strokeDasharray="0"
				{...props}
			/>
			<DebugLine
				a={vec({ x: edge.expanded - 4, y: edge.cross.min })}
				b={vec({ x: edge.expanded + 4, y: edge.cross.min })}
				strokeDasharray="0"
				{...props}
			/>
			<DebugLine
				a={vec({ x: edge.expanded - 4, y: edge.cross.max })}
				b={vec({ x: edge.expanded + 4, y: edge.cross.max })}
				strokeDasharray="0"
				{...props}
			/>
		</g>
	)
}
