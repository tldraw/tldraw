import {
	getIndicesAbove,
	PathBuilder,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	SVGContainer,
	T,
	TLBaseShape,
	TLHandle,
	TLHandleDragInfo,
	toDomPrecision,
	VecModel,
	vecModelValidator,
	ZERO_INDEX_KEY,
} from 'tldraw'
import { GlobBinding } from './GlobBindingUtil'
import { NodeShape } from './NodeShapeUtil'
import { getGlobEndPoint } from './utils'

export interface EdgeCurve {
	tangentA: VecModel
	tangentB: VecModel
	d: VecModel
	tensionA: VecModel
	tensionB: VecModel
}

export type EdgeCurveType = 'edgeA' | 'edgeB'
export interface GlobProps {
	edges: {
		edgeA: EdgeCurve
		edgeB: EdgeCurve
	}
	opacity: number
}

export type GlobShape = TLBaseShape<'glob', GlobProps>

const edgeCurveValidator = T.object({
	tangentA: vecModelValidator,
	tangentB: vecModelValidator,
	d: vecModelValidator,
	tensionA: vecModelValidator,
	tensionB: vecModelValidator,
})

export class GlobShapeUtil extends ShapeUtil<GlobShape> {
	static override type = 'glob' as const
	static override props: RecordProps<GlobShape> = {
		edges: T.object({
			edgeA: edgeCurveValidator,
			edgeB: edgeCurveValidator,
		}),
		opacity: T.number,
	}

	override getDefaultProps(): GlobShape['props'] {
		return {
			edges: {
				edgeA: {
					tangentA: { x: 0, y: 0 },
					tangentB: { x: 0, y: 0 },
					d: { x: 0, y: 0 },
					tensionA: { x: 0, y: 0 },
					tensionB: { x: 0, y: 0 },
				},
				edgeB: {
					tangentA: { x: 0, y: 0 },
					tangentB: { x: 0, y: 0 },
					d: { x: 0, y: 0 },
					tensionA: { x: 0, y: 0 },
					tensionB: { x: 0, y: 0 },
				},
			},
			opacity: 1,
		}
	}

	override getGeometry(shape: GlobShape) {
		const pathBuilder = this.buildGlobPath(shape)
		if (!pathBuilder) return new Rectangle2d({ width: 0, height: 0, isFilled: true })

		return pathBuilder.toGeometry()
	}

	override getHandles(shape: GlobShape) {
		const NUM_D_POINTS = 2
		const NUM_TENSION_POINTS = 4

		const indices = getIndicesAbove(ZERO_INDEX_KEY, NUM_D_POINTS + NUM_TENSION_POINTS)
		let idx = 0

		const handles: TLHandle[] = []

		const handlePoints = [
			'd',
			'tensionA',
			'tensionB',
		] as const satisfies readonly (keyof EdgeCurve)[]

		for (const [edgeType, params] of Object.entries(shape.props.edges)) {
			for (const point of handlePoints) {
				handles.push({
					id: `${edgeType}.${point}`,
					type: 'vertex',
					x: params[point].x,
					y: params[point].y,
					index: indices[idx++],
				})
			}
		}

		return handles
	}

	override onHandleDrag(shape: GlobShape, info: TLHandleDragInfo<GlobShape>) {
		const { handle } = info
		const { id } = handle
		const [edgeType, point] = id.split('.') as [EdgeCurveType, keyof EdgeCurve]

		const edge = shape.props.edges[edgeType]
		const currentHandle = edge[point]

		console.log(`${edgeType}.${point}:`, currentHandle)
	}

	override component(shape: GlobShape) {
		const zoomLevel = this.editor.getZoomLevel()

		const pathBuilder = this.buildGlobPath(shape)
		if (!pathBuilder) return null
		const bindings = this.getBindings(shape)
		if (!bindings) return null

		const { startNode, endNode } = bindings

		const e1 = getGlobEndPoint(startNode, shape.props.edges.edgeA.d, startNode.props.radius, 0)
		const e2 = getGlobEndPoint(endNode, shape.props.edges.edgeA.d, endNode.props.radius, 1)

		const e3 = getGlobEndPoint(startNode, shape.props.edges.edgeB.d, startNode.props.radius, 1)
		const e4 = getGlobEndPoint(endNode, shape.props.edges.edgeB.d, endNode.props.radius, 0)

		return (
			<SVGContainer>
				<line
					x1={toDomPrecision(shape.props.edges.edgeA.d.x)}
					y1={toDomPrecision(shape.props.edges.edgeA.d.y)}
					x2={toDomPrecision(e1.x)}
					y2={toDomPrecision(e1.y)}
					stroke="blue"
					strokeDasharray={`${6 / zoomLevel} ${6 / zoomLevel}`}
					strokeWidth={1 / zoomLevel}
				/>
				<line
					x1={toDomPrecision(shape.props.edges.edgeA.d.x)}
					y1={toDomPrecision(shape.props.edges.edgeA.d.y)}
					x2={toDomPrecision(e2.x)}
					y2={toDomPrecision(e2.y)}
					stroke="blue"
					strokeDasharray={`${6 / zoomLevel} ${6 / zoomLevel}`}
					strokeWidth={1 / zoomLevel}
				/>
				<line
					x1={toDomPrecision(shape.props.edges.edgeB.d.x)}
					y1={toDomPrecision(shape.props.edges.edgeB.d.y)}
					x2={toDomPrecision(e3.x)}
					y2={toDomPrecision(e3.y)}
					stroke="blue"
					strokeDasharray={`${6 / zoomLevel} ${6 / zoomLevel}`}
					strokeWidth={1 / zoomLevel}
				/>
				<line
					x1={toDomPrecision(shape.props.edges.edgeB.d.x)}
					y1={toDomPrecision(shape.props.edges.edgeB.d.y)}
					x2={toDomPrecision(e4.x)}
					y2={toDomPrecision(e4.y)}
					stroke="blue"
					strokeDasharray={`${6 / zoomLevel} ${6 / zoomLevel}`}
					strokeWidth={1 / zoomLevel}
				/>
				<path
					d={pathBuilder.toD()}
					stroke="black"
					fill="#F9F7DF"
					opacity={shape.props.opacity}
					strokeWidth={1 / zoomLevel}
				/>
			</SVGContainer>
		)
	}

	override indicator(shape: GlobShape) {
		const pathBuilder = this.buildGlobPath(shape)
		if (!pathBuilder) return null

		const bindings = this.getBindings(shape)
		if (!bindings) return null

		const { startNode } = bindings

		// const p = getGlobEndPoint(startNode, shape.props.dPoints[0], startNode.props.radius)

		return (
			<SVGContainer>
				{/* <line
					x1={shape.props.dPoints[0].x}
					y1={shape.props.dPoints[0].y}
					x2={p.x}
					y2={p.y}
					stroke="blue"
					strokeWidth={1}
				/> */}
				<path d={pathBuilder.toD()} stroke="black" fill="#F9F7DF" opacity={shape.props.opacity} />
			</SVGContainer>
		)
	}

	private getBindings(shape: GlobShape) {
		const bindings = this.editor.getBindingsFromShape<GlobBinding>(shape.id, 'glob')
		const startNode = this.editor.getShape<NodeShape>(
			bindings.find((b) => b.props.terminal === 'start')!.toId!
		)
		if (!startNode) return null

		const endNode = this.editor.getShape<NodeShape>(
			bindings.find((b) => b.props.terminal === 'end')!.toId!
		)
		if (!endNode) return null

		return { startNode, endNode }
	}

	private buildGlobPath(shape: GlobShape) {
		const bindings = this.getBindings(shape)
		if (!bindings) return null

		const { startNode, endNode } = bindings

		const pathBuilder = new PathBuilder()
		pathBuilder.moveTo(shape.props.edges.edgeA.tangentA.x, shape.props.edges.edgeA.tangentA.y, {
			geometry: { isFilled: true },
		})
		pathBuilder.circularArcTo(
			startNode.props.radius,
			false,
			true,
			shape.props.edges.edgeB.tangentA.x,
			shape.props.edges.edgeB.tangentA.y
		)

		pathBuilder.cubicBezierTo(
			shape.props.edges.edgeB.tangentB.x,
			shape.props.edges.edgeB.tangentB.y,
			shape.props.edges.edgeB.tensionA.x,
			shape.props.edges.edgeB.tensionA.y,
			shape.props.edges.edgeB.tensionB.x,
			shape.props.edges.edgeB.tensionB.y
		)

		pathBuilder.circularArcTo(
			endNode.props.radius,
			false,
			true,
			shape.props.edges.edgeA.tangentB.x,
			shape.props.edges.edgeA.tangentB.y
		)

		pathBuilder.cubicBezierTo(
			shape.props.edges.edgeA.tangentA.x,
			shape.props.edges.edgeA.tangentA.y,
			shape.props.edges.edgeA.tensionB.x,
			shape.props.edges.edgeA.tensionB.y,
			shape.props.edges.edgeA.tensionA.x,
			shape.props.edges.edgeA.tensionA.y
		)

		pathBuilder.close()

		return pathBuilder
	}
}
