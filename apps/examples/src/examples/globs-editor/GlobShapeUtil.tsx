import { useEffect, useState } from 'react'
import {
	createComputedCache,
	Editor,
	getIndicesAbove,
	Group2d,
	HandleSnapGeometry,
	PathBuilder,
	Polyline2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	SVGContainer,
	T,
	TLBaseShape,
	TLHandle,
	TLHandleDragInfo,
	toDomPrecision,
	useEditor,
	Vec,
	VecModel,
	vecModelValidator,
	ZERO_INDEX_KEY,
} from 'tldraw'
import { GlobBinding } from './GlobBindingUtil'
import { NodeShape } from './NodeShapeUtil'
import { getArcFlag, getGlobEndPoint, projectTensionPoint } from './utils'

export interface NodeGeometry {
	position: VecModel
	radius: number
}

export interface EdgeGeometry {
	tangentA: VecModel
	tangentB: VecModel
	tensionA: VecModel
	tensionB: VecModel
}
export interface GlobGeometry {
	startNode: NodeGeometry
	endNode: NodeGeometry
	edgeA: EdgeGeometry
	edgeB: EdgeGeometry
}
export interface EdgeProps {
	d: VecModel
	tensionRatioA: number
	tensionRatioB: number
}

export type EdgeCurveType = 'edgeA' | 'edgeB'
export interface GlobProps {
	edges: {
		edgeA: EdgeProps
		edgeB: EdgeProps
	}
	opacity: number
	isGhosting: boolean
}

export type GlobShape = TLBaseShape<'glob', GlobProps>

const edgeCurveValidator = T.object({
	d: vecModelValidator,
	tensionRatioA: T.number,
	tensionRatioB: T.number,
})

const globInfoCache = createComputedCache<Editor, GlobGeometry | null, GlobShape>(
	'glob info',
	(editor: Editor, shape: GlobShape): GlobGeometry | null => {
		const bindings = editor.getBindingsFromShape<GlobBinding>(shape.id, 'glob')
		const startBinding = bindings.find((b) => b.props.terminal === 'start')
		if (!startBinding) return null

		const startNodeShape = editor.getShape<NodeShape>(startBinding.toId)
		if (!startNodeShape) return null

		const endBinding = bindings.find((b) => b.props.terminal === 'end')
		if (!endBinding) return null

		const endNodeShape = editor.getShape<NodeShape>(endBinding.toId)
		if (!endNodeShape) return null

		const localStartNode = Vec.Sub(startNodeShape, shape)
		const localEndNode = Vec.Sub(endNodeShape, shape)

		let tangentA_A = getGlobEndPoint(
			localStartNode,
			shape.props.edges.edgeA.d,
			startNodeShape.props.radius,
			0
		)
		let tangentB_A = getGlobEndPoint(
			localEndNode,
			shape.props.edges.edgeA.d,
			endNodeShape.props.radius,
			1
		)

		let tangentA_B = getGlobEndPoint(
			localStartNode,
			shape.props.edges.edgeB.d,
			startNodeShape.props.radius,
			1
		)

		let tangentB_B = getGlobEndPoint(
			localEndNode,
			shape.props.edges.edgeB.d,
			endNodeShape.props.radius,
			0
		)

		if (!tangentA_A && tangentA_B) {
			tangentA_A = tangentA_B
		} else if (!tangentA_B && tangentA_A) {
			tangentA_B = tangentA_A
		}

		if (!tangentB_A && tangentB_B) {
			tangentB_A = tangentB_B
		} else if (!tangentB_B && tangentB_A) {
			tangentB_B = tangentB_A
		}

		if (!tangentA_A || !tangentB_A || !tangentA_B || !tangentB_B) return null

		return {
			startNode: {
				position: localStartNode,
				radius: startNodeShape.props.radius,
			},
			endNode: {
				position: localEndNode,
				radius: endNodeShape.props.radius,
			},
			edgeA: {
				tangentA: tangentA_A,
				tangentB: tangentB_A,
				tensionA: Vec.Lrp(
					tangentA_A,
					shape.props.edges.edgeA.d,
					shape.props.edges.edgeA.tensionRatioA
				),
				tensionB: Vec.Lrp(
					shape.props.edges.edgeA.d,
					tangentB_A,
					shape.props.edges.edgeA.tensionRatioB
				),
			},
			edgeB: {
				tangentA: tangentA_B,
				tangentB: tangentB_B,
				tensionA: Vec.Lrp(
					tangentA_B,
					shape.props.edges.edgeB.d,
					shape.props.edges.edgeB.tensionRatioA
				),
				tensionB: Vec.Lrp(
					shape.props.edges.edgeB.d,
					tangentB_B,
					shape.props.edges.edgeB.tensionRatioB
				),
			},
		}
	}
)

export function getGlobInfo(editor: Editor, shape: GlobShape): GlobGeometry | null {
	return globInfoCache.get(editor, shape.id) ?? null
}

export class GlobShapeUtil extends ShapeUtil<GlobShape> {
	static override type = 'glob' as const
	static override props: RecordProps<GlobShape> = {
		edges: T.object({
			edgeA: edgeCurveValidator,
			edgeB: edgeCurveValidator,
		}),
		opacity: T.number,
		isGhosting: T.boolean,
	}

	override getDefaultProps(): GlobShape['props'] {
		return {
			edges: {
				edgeA: {
					d: { x: 0, y: 0 },
					tensionRatioA: 0.5,
					tensionRatioB: 0.5,
				},
				edgeB: {
					d: { x: 0, y: 0 },
					tensionRatioA: 0.5,
					tensionRatioB: 0.5,
				},
			},
			opacity: 1,
			isGhosting: false,
		}
	}

	override hideSelectionBoundsBg(_shape: GlobShape): boolean {
		return true
	}

	override hideResizeHandles(_shape: GlobShape): boolean {
		return true
	}

	override hideRotateHandle(_shape: GlobShape): boolean {
		return true
	}

	override hideSelectionBoundsFg(_shape: GlobShape): boolean {
		return true
	}

	override getGeometry(shape: GlobShape) {
		const pathBuilder = this.buildGlobPath(shape, true)
		if (!pathBuilder) return new Rectangle2d({ width: 1, height: 1, isFilled: false })

		return pathBuilder.toGeometry()
	}

	override getHandles(shape: GlobShape) {
		const globPoints = getGlobInfo(this.editor, shape)
		if (!globPoints) return []

		const NUM_D_POINTS = 2
		const NUM_TENSION_POINTS = 4

		const indices = getIndicesAbove(ZERO_INDEX_KEY, NUM_D_POINTS + NUM_TENSION_POINTS)
		let idx = 0

		const handles: TLHandle[] = []
		handles.push({
			id: 'edgeA.d',
			type: 'vertex',
			x: shape.props.edges.edgeA.d.x,
			y: shape.props.edges.edgeA.d.y,
			index: indices[idx++],
			snapType: 'align',
		})
		handles.push({
			id: 'edgeB.d',
			type: 'vertex',
			x: shape.props.edges.edgeB.d.x,
			y: shape.props.edges.edgeB.d.y,
			index: indices[idx++],
			snapType: 'align',
		})

		const tensions = [
			'tensionA',
			'tensionB',
		] as const satisfies readonly (keyof GlobGeometry['edgeA'])[]

		for (const edge of ['edgeA', 'edgeB'] as const satisfies readonly (keyof GlobGeometry)[]) {
			for (const tension of tensions) {
				handles.push({
					id: `${edge}.${tension}`,
					type: 'vertex',
					x: globPoints[edge][tension].x,
					y: globPoints[edge][tension].y,
					index: indices[idx++],
					snapType: 'align',
				})
			}
		}

		return handles
	}

	override onHandleDrag(shape: GlobShape, info: TLHandleDragInfo<GlobShape>) {
		const { handle } = info
		const { id } = handle
		const [edgeType, point] = id.split('.') as [EdgeCurveType, keyof EdgeGeometry | keyof EdgeProps]
		const edge = shape.props.edges[edgeType]

		switch (point) {
			case 'd': {
				return {
					...shape,
					props: {
						...shape.props,
						edges: {
							...shape.props.edges,
							[edgeType]: {
								...edge,
								d: { x: handle.x, y: handle.y },
							},
						},
					},
				}
			}
			case 'tensionA': {
				const globPoints = getGlobInfo(this.editor, shape)
				if (!globPoints) return shape

				const lineStart = globPoints.edgeA.tangentA
				const lineEnd = shape.props.edges[edgeType].d
				const projectedPoint = projectTensionPoint(lineStart, lineEnd, handle)

				return {
					...shape,
					props: {
						...shape.props,
						edges: {
							...shape.props.edges,
							[edgeType]: {
								...edge,
								tensionRatioA: projectedPoint,
							},
						},
					},
				}
			}
			case 'tensionB': {
				const globPoints = getGlobInfo(this.editor, shape)
				if (!globPoints) return shape

				const lineStart = shape.props.edges[edgeType].d
				const lineEnd = globPoints.edgeB.tangentB
				const projectedPoint = projectTensionPoint(lineStart, lineEnd, handle)

				return {
					...shape,
					props: {
						...shape.props,
						edges: {
							...shape.props.edges,
							[edgeType]: {
								...edge,
								tensionRatioB: projectedPoint,
							},
						},
					},
				}
			}
		}

		return shape
	}

	override component(shape: GlobShape) {
		const zoomLevel = this.editor.getZoomLevel()

		const [fillGlob, setFillGlob] = useState(false)

		useEffect(() => {
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.code === 'Space') {
					setFillGlob(true)
				}
			}

			const handleKeyUp = (e: KeyboardEvent) => {
				if (e.code === 'Space') {
					setFillGlob(false)
				}
			}

			const container = this.editor.getContainer()
			const doc = container.ownerDocument

			doc.addEventListener('keydown', handleKeyDown)
			doc.addEventListener('keyup', handleKeyUp)

			return () => {
				doc.removeEventListener('keydown', handleKeyDown)
				doc.removeEventListener('keyup', handleKeyUp)
			}
		}, [])

		const pathBuilder = this.buildGlobPath(shape)
		if (!pathBuilder) return null

		const showControlLines =
			this.editor.isInAny(
				'select.idle',
				'select.pointing_handle',
				'select.pointing_shape',
				'select.dragging_handle'
			) && this.editor.getOnlySelectedShape() === shape

		const globPoints = getGlobInfo(this.editor, shape)
		if (!globPoints) return null

		const dxA = toDomPrecision(shape.props.edges.edgeA.d.x)
		const dxY = toDomPrecision(shape.props.edges.edgeA.d.y)
		const dxB = toDomPrecision(shape.props.edges.edgeB.d.x)
		const dyB = toDomPrecision(shape.props.edges.edgeB.d.y)

		const txAA = toDomPrecision(globPoints.edgeA.tangentA.x)
		const tyAA = toDomPrecision(globPoints.edgeA.tangentA.y)
		const txAB = toDomPrecision(globPoints.edgeA.tangentB.x)
		const tyAB = toDomPrecision(globPoints.edgeA.tangentB.y)

		const txBA = toDomPrecision(globPoints.edgeB.tangentA.x)
		const tyBA = toDomPrecision(globPoints.edgeB.tangentA.y)
		const txBB = toDomPrecision(globPoints.edgeB.tangentB.x)
		const tyBB = toDomPrecision(globPoints.edgeB.tangentB.y)

		return (
			<SVGContainer>
				{showControlLines && (
					<>
						<ControlLine x1={dxA} y1={dxY} x2={txAA} y2={tyAA} />
						<ControlLine x1={dxA} y1={dxY} x2={txAB} y2={tyAB} />
						<ControlLine x1={dxB} y1={dyB} x2={txBA} y2={tyBA} />
						<ControlLine x1={dxB} y1={dyB} x2={txBB} y2={tyBB} />
					</>
				)}
				<path
					d={pathBuilder.toD()}
					stroke="black"
					fill={fillGlob ? 'black' : 'white'}
					opacity={fillGlob ? 1 : 0.75}
					strokeWidth={2 / zoomLevel}
				/>
			</SVGContainer>
		)
	}

	override indicator(shape: GlobShape) {
		const zoomLevel = this.editor.getZoomLevel()

		const pathBuilder = this.buildGlobPath(shape)
		if (!pathBuilder) return null

		return (
			<SVGContainer>
				<path
					pointerEvents="none"
					d={pathBuilder.toD()}
					stroke="black"
					strokeWidth={2 / zoomLevel}
					opacity={0.25}
					fill="blue"
				/>
			</SVGContainer>
		)
	}

	override getHandleSnapGeometry(shape: GlobShape): HandleSnapGeometry {
		const globPoints = getGlobInfo(this.editor, shape)
		if (!globPoints) {
			return { points: [shape.props.edges.edgeA.d, shape.props.edges.edgeB.d] }
		}

		// Helper to extend a line segment far in both directions
		const extendLine = (start: VecModel, end: VecModel): Vec[] => {
			const direction = Vec.Sub(end, start)
			const length = Vec.Len(direction)
			if (length === 0) return [Vec.From(start), Vec.From(end)] // Avoid division by zero

			const unitDir = Vec.Div(direction, length)
			const EXTEND = 10000 // Large enough to cover any viewport

			return [Vec.Sub(start, Vec.Mul(unitDir, EXTEND)), Vec.Add(end, Vec.Mul(unitDir, EXTEND))]
		}

		// Create extended control lines for all segments
		const edgeALine1 = extendLine(globPoints.edgeA.tangentA, shape.props.edges.edgeA.d)
		const edgeALine2 = extendLine(shape.props.edges.edgeA.d, globPoints.edgeA.tangentB)
		const edgeBLine1 = extendLine(globPoints.edgeB.tangentA, shape.props.edges.edgeB.d)
		const edgeBLine2 = extendLine(shape.props.edges.edgeB.d, globPoints.edgeB.tangentB)

		const snapGeometry = new Group2d({
			children: [
				new Polyline2d({ points: edgeALine1 }),
				new Polyline2d({ points: edgeALine2 }),
				new Polyline2d({ points: edgeBLine1 }),
				new Polyline2d({ points: edgeBLine2 }),
			],
		})

		return {
			// Snap to d points and tangent points
			points: [
				shape.props.edges.edgeA.d,
				shape.props.edges.edgeB.d,
				globPoints.edgeA.tangentA,
				globPoints.edgeA.tangentB,
				globPoints.edgeB.tangentA,
				globPoints.edgeB.tangentB,
			],
			// Snap to extended control lines
			outline: snapGeometry,
			// Prevent snapping to own shape's opposite edge while dragging
			getSelfSnapPoints(handle) {
				if (handle.id === 'edgeA.d') {
					return [shape.props.edges.edgeB.d]
				}
				if (handle.id === 'edgeB.d') {
					return [shape.props.edges.edgeA.d]
				}
				return []
			},
			getSelfSnapOutline(handle) {
				// Return null to prevent self-snapping to outlines (or customize as needed)
				return null
			},
		}
	}

	private buildGlobPath(shape: GlobShape, geometry: boolean = false) {
		const globPoints = getGlobInfo(this.editor, shape)
		if (!globPoints) return null

		const pathBuilder = new PathBuilder()
		pathBuilder.moveTo(globPoints.edgeA.tangentA.x, globPoints.edgeA.tangentA.y, {
			geometry: { isFilled: true },
		})

		const arcFlagA = getArcFlag(
			globPoints.startNode.position,
			globPoints.edgeA.tangentA,
			globPoints.edgeB.tangentA
		)

		const arcFlagB = getArcFlag(
			globPoints.endNode.position,
			globPoints.edgeB.tangentB,
			globPoints.edgeA.tangentB
		)

		pathBuilder.circularArcTo(
			globPoints.startNode.radius,
			geometry ? !arcFlagA : arcFlagA,
			geometry ? false : true,
			globPoints.edgeB.tangentA.x,
			globPoints.edgeB.tangentA.y
		)

		pathBuilder.cubicBezierTo(
			globPoints.edgeB.tangentB.x,
			globPoints.edgeB.tangentB.y,
			globPoints.edgeB.tensionA.x,
			globPoints.edgeB.tensionA.y,
			globPoints.edgeB.tensionB.x,
			globPoints.edgeB.tensionB.y
		)

		pathBuilder.circularArcTo(
			globPoints.endNode.radius,
			geometry ? !arcFlagB : arcFlagB,
			geometry ? false : true,
			globPoints.edgeA.tangentB.x,
			globPoints.edgeA.tangentB.y
		)

		pathBuilder.cubicBezierTo(
			globPoints.edgeA.tangentA.x,
			globPoints.edgeA.tangentA.y,
			globPoints.edgeA.tensionB.x,
			globPoints.edgeA.tensionB.y,
			globPoints.edgeA.tensionA.x,
			globPoints.edgeA.tensionA.y
		)

		pathBuilder.close()

		return pathBuilder
	}
}

function ControlLine({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
	const editor = useEditor()
	const zoomLevel = editor.getZoomLevel()
	const dashArray = `${3 / zoomLevel} ${3 / zoomLevel}`

	return (
		<>
			<line
				x1={x1}
				y1={y1}
				x2={x2}
				y2={y2}
				stroke="#4169E1"
				strokeDasharray={dashArray}
				strokeWidth={1 / zoomLevel}
			/>
		</>
	)
}
