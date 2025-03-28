import { Box, TLArrowShape, useEditor, useValue, VecLike } from '@tldraw/editor'
import { SVGProps } from 'react'
import { getArrowBindings } from '../shared'
import {
	ElbowArrowEdge,
	ElbowArrowScale,
	getElbowArrowInfo,
	transformPoint,
} from './getElbowArrowInfo'

const SHOW_STEVE = true

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
	const gizmoX = info.scale.x === 1 ? fullBox.minX : fullBox.maxX
	const gizmoY = info.scale.y === 1 ? fullBox.minY : fullBox.maxY

	const label = [info.hPos, info.vPos, info.route?.name].filter(Boolean).join(', ')

	const steve = SHOW_STEVE ? info.steve() : null

	return (
		<>
			{/* <DebugBox box={transformBox(info.expanded.A, info.scale)} stroke="orange" /> */}
			{/* <DebugBox box={transformBox(info.expanded.B, info.scale)} stroke="lightskyblue" /> */}
			{info.midX !== null && (
				<DebugLine
					a={{ x: info.midX * info.scale.x, y: fullBox.minY }}
					b={{ x: info.midX * info.scale.x, y: fullBox.maxY }}
					stroke="red"
				/>
			)}
			{info.midY !== null && (
				<DebugLine
					a={{ x: fullBox.minX, y: info.midY * info.scale.y }}
					b={{ x: fullBox.maxX, y: info.midY * info.scale.y }}
					stroke="blue"
				/>
			)}

			<g transform={`translate(${gizmoX}, ${gizmoY}) scale(${info.scale.x}, ${info.scale.y})`}>
				<line x1={0} y1={0} x2={30} y2={0} stroke="red" />
				<line x1={0} y1={0} x2={0} y2={30} stroke="blue" />
			</g>
			<DebugEdge edge={info.A.edges.top} axis="x" scale={info.scale} stroke="orange" />
			<DebugEdge edge={info.B.edges.top} axis="x" scale={info.scale} stroke="lightskyblue" />
			<DebugEdge edge={info.A.edges.right} axis="y" scale={info.scale} stroke="orange" />
			<DebugEdge edge={info.B.edges.right} axis="y" scale={info.scale} stroke="lightskyblue" />
			<DebugEdge edge={info.A.edges.bottom} axis="x" scale={info.scale} stroke="orange" />
			<DebugEdge edge={info.B.edges.bottom} axis="x" scale={info.scale} stroke="lightskyblue" />
			<DebugEdge edge={info.A.edges.left} axis="y" scale={info.scale} stroke="orange" />
			<DebugEdge edge={info.B.edges.left} axis="y" scale={info.scale} stroke="lightskyblue" />

			{info.route && <DebugRoute route={info.route.points} strokeWidth={10} />}
			{steve?.path && (
				<DebugRoute route={steve.path} stroke="white" strokeDasharray="0,9" strokeWidth={5} />
			)}
			{steve?.path && <DebugRoute route={steve.path} stroke="deeppink" strokeDasharray="0,9" />}

			<text
				x={fullBox.minX + 5}
				y={fullBox.minY - 3}
				fontSize={10}
				fill="black"
				stroke="var(--color-background)"
				strokeWidth={2}
				paintOrder="stroke"
			>
				{label}
			</text>
			<text
				x={info.A.expanded.x * info.scale.x}
				y={info.A.expanded.y * info.scale.y}
				fontSize={10}
				fill="black"
				stroke="var(--color-background)"
				strokeWidth={2}
				paintOrder="stroke"
			>
				A{info.route && ` - ${info.route.aEdgePicking}`}
			</text>
			<text
				x={info.B.expanded.x * info.scale.x}
				y={info.B.expanded.y * info.scale.y}
				fontSize={10}
				fill="black"
				stroke="var(--color-background)"
				strokeWidth={2}
				paintOrder="stroke"
			>
				B{info.route && ` - ${info.route.bEdgePicking}`}
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
