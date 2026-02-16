import { round } from 'lodash'
import {
	createComputedCache,
	Editor,
	getIndicesAbove,
	HandleSnapGeometry,
	Mat,
	PathBuilder,
	PointsSnapIndicator,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	SVGContainer,
	T,
	TLHandle,
	TLHandleDragInfo,
	TLResizeInfo,
	TLShape,
	TLShapePartial,
	toDomPrecision,
	track,
	uniqueId,
	useEditor,
	useValue,
	Vec,
	VecModel,
	vecModelValidator,
	ZERO_INDEX_KEY,
} from 'tldraw'
import { GlobBinding } from './GlobBindingUtil'
import { getStartAndEndNodes } from './shared'
import {
	getArcFlag,
	getClosestPointOnCircle,
	getGlobEndPoint,
	getOuterTangentPoints,
	projectTensionPoint,
} from './utils'

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

const GLOB_TYPE = 'glob'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[GLOB_TYPE]: GlobProps
	}
}

export type GlobShape = TLShape<'glob'>

interface SnapData {
	nudge: VecModel
	indicators: PointsSnapIndicator[]
}

const edgeCurveValidator = T.object({
	d: vecModelValidator,
	tensionRatioA: T.number,
	tensionRatioB: T.number,
})

const globInfoCache = createComputedCache<Editor, GlobGeometry | null, GlobShape>(
	'glob info',
	(editor: Editor, shape: GlobShape): GlobGeometry | null => {
		const nodes = getStartAndEndNodes(editor, shape.id)
		if (!nodes) return null

		const { startNodeShape, endNodeShape } = nodes

		const startNodePagePos = editor.getShapePageTransform(startNodeShape.id).point()
		const endNodePagePos = editor.getShapePageTransform(endNodeShape.id).point()
		const globPagePos = editor.getShapePageTransform(shape.id).point()

		const localStartNode = Vec.Sub(startNodePagePos, globPagePos)
		const localEndNode = Vec.Sub(endNodePagePos, globPagePos)

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

		// if we drag a node over an existing d handle, the solution does not exist so collapse the points
		//
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

	override onResize(_shape: GlobShape, info: TLResizeInfo<GlobShape>) {
		const { scaleX, scaleY, initialShape } = info

		const scaledEdgeA_d = {
			x: initialShape.props.edges.edgeA.d.x * scaleX,
			y: initialShape.props.edges.edgeA.d.y * scaleY,
		}
		const scaledEdgeB_d = {
			x: initialShape.props.edges.edgeB.d.x * scaleX,
			y: initialShape.props.edges.edgeB.d.y * scaleY,
		}

		const didFlipX = scaleX < 0
		const didFlipY = scaleY < 0

		const shouldSwap = didFlipX !== didFlipY

		const finalEdgeA = shouldSwap
			? {
					...initialShape.props.edges.edgeB,
					d: scaledEdgeB_d,
				}
			: {
					...initialShape.props.edges.edgeA,
					d: scaledEdgeA_d,
				}

		const finalEdgeB = shouldSwap
			? {
					...initialShape.props.edges.edgeA,
					d: scaledEdgeA_d,
				}
			: {
					...initialShape.props.edges.edgeB,
					d: scaledEdgeB_d,
				}

		return {
			props: {
				edges: {
					edgeA: finalEdgeA,
					edgeB: finalEdgeB,
				},
			},
		}
	}

	override onRotate(initial: GlobShape, current: GlobShape): TLShapePartial<GlobShape> {
		const delta = current.rotation - initial.rotation

		const rotatedDA = Vec.Rot(initial.props.edges.edgeA.d, delta).toJson()
		const rotatedDB = Vec.Rot(initial.props.edges.edgeB.d, delta).toJson()

		// rotating nodes will handle rotating the glob, but we still need to update the d handles
		return {
			id: current.id,
			type: current.type,
			rotation: 0,
			props: {
				edges: {
					edgeA: {
						...initial.props.edges.edgeA,
						d: rotatedDA,
					},
					edgeB: {
						...initial.props.edges.edgeB,
						d: rotatedDB,
					},
				},
			},
		}
	}

	override getGeometry(shape: GlobShape) {
		const globPoints = getGlobInfo(this.editor, shape)
		if (!globPoints) return new Rectangle2d({ width: 1, height: 1, isFilled: false })

		const pathBuilder = buildGlobPath(globPoints, true)
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
			snapType: 'point',
		})
		handles.push({
			id: 'edgeB.d',
			type: 'vertex',
			x: shape.props.edges.edgeB.d.x,
			y: shape.props.edges.edgeB.d.y,
			index: indices[idx++],
			snapType: 'point',
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
					snapType: 'point',
					snapReferenceHandleId: `${edge}.${tension}`, // this is a hack to make these handles not have angle snapping, when we shift drag which moves all tension handles at the same time
				})
			}
		}

		return handles
	}

	override getHandleSnapGeometry(shape: GlobShape): HandleSnapGeometry {
		const editor = this.editor
		const globPoints = getGlobInfo(editor, shape)
		if (!globPoints) return {}

		return {
			getSelfSnapPoints(handle) {
				const { edgeType, point } = getHandleData(handle.id)
				const d = shape.props.edges[edgeType].d

				switch (point) {
					case 'tensionA': {
						const mid = Vec.Lrp(globPoints[edgeType].tangentA, d, 0.5)
						return [mid]
					}
					case 'tensionB': {
						const mid = Vec.Lrp(globPoints[edgeType].tangentB, d, 0.5)
						return [mid]
					}
				}
				return []
			},
		}
	}

	override onHandleDrag(shape: GlobShape, info: TLHandleDragInfo<GlobShape>) {
		const { handle, initial } = info
		if (!initial) return shape

		const globPoints = getGlobInfo(this.editor, shape)
		if (!globPoints) return shape

		const { edgeType, point } = getHandleData(handle.id)
		const edge = shape.props.edges[edgeType]

		const oppositeEdgeType = edgeType === 'edgeA' ? 'edgeB' : 'edgeA'

		const initialEdge = initial.props.edges[edgeType]
		const initialOppositeEdge = initial.props.edges[oppositeEdgeType]

		switch (point) {
			case 'd': {
				let d = { x: handle.x, y: handle.y }

				this.editor.snaps.clearIndicators()
				const snapPoint = this.getSnaps(shape, handle)

				const isSnapMode = this.editor.user.getIsSnapMode()
				if (
					snapPoint &&
					!this.editor.inputs.getMetaKey() &&
					(isSnapMode ? !this.editor.inputs.getCtrlKey() : this.editor.inputs.getCtrlKey())
				) {
					this.editor.snaps.setIndicators(snapPoint.indicators)

					return {
						...shape,
						props: {
							...shape.props,
							edges: {
								...shape.props.edges,
								[edgeType]: {
									...edge,
									d: Vec.Add(d, snapPoint.nudge).toJson(),
								},
							},
						},
					}
				}

				// constrain the d handle around the node if we try drag it inside a node
				const distStart = Vec.Dist(handle, globPoints.startNode.position)
				if (distStart <= globPoints.startNode.radius) {
					d = getClosestPointOnCircle(
						globPoints.startNode.position,
						globPoints.startNode.radius,
						handle
					)
				}

				// constrain the d handle around the node if we try drag it inside a node
				const distEnd = Vec.Dist(handle, globPoints.endNode.position)
				if (distEnd <= globPoints.endNode.radius) {
					d = getClosestPointOnCircle(
						globPoints.endNode.position,
						globPoints.endNode.radius,
						handle
					)
				}

				// drag both d handles at the same time
				if (this.editor.inputs.getMetaKey()) {
					const delta = Vec.Sub(handle, initialEdge.d)

					return {
						...shape,
						props: {
							...shape.props,
							edges: {
								...shape.props.edges,
								[oppositeEdgeType]: {
									...initialOppositeEdge,
									d: Vec.Add(initialOppositeEdge.d, delta).toJson(),
								},
								[edgeType]: {
									...edge,
									d: d,
								},
							},
						},
					}
				}

				return {
					...shape,
					props: {
						...shape.props,
						edges: {
							...shape.props.edges,
							[edgeType]: {
								...edge,
								d: d,
							},
							[oppositeEdgeType]: {
								...initialOppositeEdge,
							},
						},
					},
				}
			}
			case 'tensionA': {
				const lineStart = globPoints[edgeType].tangentA
				const lineEnd = shape.props.edges[edgeType].d
				const projectedPoint = projectTensionPoint(lineStart, lineEnd, handle)

				// drag ALL the tension handles
				if (this.editor.inputs.getMetaKey() && this.editor.inputs.getShiftKey()) {
					return {
						...shape,
						props: {
							...shape.props,
							edges: {
								...shape.props.edges,
								[edgeType]: {
									...initialEdge,
									tensionRatioA: projectedPoint,
									tensionRatioB: 1 - projectedPoint,
								},
								[oppositeEdgeType]: {
									...initialOppositeEdge,
									tensionRatioA: projectedPoint,
									tensionRatioB: 1 - projectedPoint,
								},
							},
						},
					}
				}

				// drag opposite tension handles at the same time
				if (this.editor.inputs.getMetaKey()) {
					return {
						...shape,
						props: {
							...shape.props,
							edges: {
								...shape.props.edges,
								[edgeType]: {
									...initialEdge,
									tensionRatioA: projectedPoint,
									tensionRatioB: 1 - projectedPoint,
								},
							},
						},
					}
				}

				return {
					...shape,
					props: {
						...shape.props,
						edges: {
							...shape.props.edges,
							[edgeType]: {
								...initialEdge,
								tensionRatioA: projectedPoint,
							},
							[oppositeEdgeType]: {
								...initialOppositeEdge,
							},
						},
					},
				}
			}
			case 'tensionB': {
				const lineStart = shape.props.edges[edgeType].d
				const lineEnd = globPoints[edgeType].tangentB
				const projectedPoint = projectTensionPoint(lineStart, lineEnd, handle)

				// drag ALL the tension handles
				if (this.editor.inputs.getMetaKey() && this.editor.inputs.getShiftKey()) {
					return {
						...shape,
						props: {
							...shape.props,
							edges: {
								...shape.props.edges,
								[edgeType]: {
									...initialEdge,
									tensionRatioA: 1 - projectedPoint,
									tensionRatioB: projectedPoint,
								},
								[oppositeEdgeType]: {
									...initialOppositeEdge,
									tensionRatioA: 1 - projectedPoint,
									tensionRatioB: projectedPoint,
								},
							},
						},
					}
				}

				// drag opposite tension handles at the same time
				if (this.editor.inputs.getMetaKey()) {
					return {
						...shape,
						props: {
							...shape.props,
							edges: {
								...shape.props.edges,
								[edgeType]: {
									...initialEdge,
									tensionRatioA: 1 - projectedPoint,
									tensionRatioB: projectedPoint,
								},
							},
						},
					}
				}

				return {
					...shape,
					props: {
						...shape.props,
						edges: {
							...shape.props.edges,
							[edgeType]: {
								...initialEdge,
								tensionRatioB: projectedPoint,
							},
							[oppositeEdgeType]: {
								...initialOppositeEdge,
							},
						},
					},
				}
			}
		}

		return shape
	}

	override component(shape: GlobShape) {
		const showControlLines =
			this.editor.isInAny(
				'select.idle',
				'select.pointing_handle',
				'select.pointing_shape',
				'select.dragging_handle'
			) && this.editor.getOnlySelectedShape() === shape

		return <GlobShape shape={shape} showControlLines={showControlLines} />
	}

	override indicator(shape: GlobShape) {
		const zoomLevel = this.editor.getZoomLevel()

		const globPoints = getGlobInfo(this.editor, shape)
		if (!globPoints) return null

		const pathBuilder = buildGlobPath(globPoints)
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

	override toSvg(shape: GlobShape) {
		const globPoints = getGlobInfo(this.editor, shape)
		if (!globPoints) return null

		const pathBuilder = buildGlobPath(globPoints)
		if (!pathBuilder) return null

		return pathBuilder.toSvg({
			style: 'solid',
			strokeWidth: 2,
			forceSolid: false,
			props: { stroke: 'black', fill: 'black' },
		})
	}

	private getSnaps(shape: GlobShape, handle: TLHandle): SnapData | null {
		const INFINITE_LENGTH = 100000
		const pageToCurrentShape = this.editor.getShapePageTransform(shape.id).clone().invert()

		const neighborGlobs: Set<GlobShape> = getNeighborGlobs(this.editor, shape)

		// infinite lines going from direction of d handles to tangent points
		// for neighboring globs of the selected glob
		const snapEdges: { start: VecModel; end: VecModel; d: VecModel }[] = []
		for (const neighborGlob of neighborGlobs) {
			const transform = Mat.Compose(
				pageToCurrentShape,
				this.editor.getShapePageTransform(neighborGlob.id)
			)
			const neighborGeo = getGlobInfo(this.editor, neighborGlob)
			if (!neighborGeo) continue

			for (const edge of ['edgeA', 'edgeB'] as const) {
				for (const tangent of ['tangentA', 'tangentB'] as const) {
					const dLocal = neighborGlob.props.edges[edge].d
					const tangentLocal = neighborGeo[edge][tangent]
					const direction = Vec.Sub(tangentLocal, dLocal).uni()

					const infiniteEndPoint = Vec.Add(dLocal, Vec.Mul(direction, INFINITE_LENGTH))

					const p1Transformed = transform.applyToPoint(dLocal)
					const p2Transformed = transform.applyToPoint(infiniteEndPoint)

					snapEdges.push({
						start: p1Transformed,
						end: p2Transformed,
						d: p1Transformed,
					})
				}
			}
		}

		let nearestPoint: Vec | null = null
		const endPoints: VecModel[] = []
		let minDistance = this.editor.snaps.getSnapThreshold()

		for (const { start, end, d } of snapEdges) {
			const snapPoint = Vec.NearestPointOnLineSegment(start, end, handle, true)
			const distance = Vec.Dist(handle, snapPoint)

			if (round(distance) <= round(minDistance)) {
				if (round(distance) < round(minDistance)) {
					endPoints.length = 0
					minDistance = distance
					nearestPoint = snapPoint
				}
				endPoints.push(d)
			}
		}

		const globInfo = getGlobInfo(this.editor, shape)
		if (!globInfo) return null

		const { edgeType } = getHandleData(handle.id)
		const outerTangentPoints = getOuterTangentPoints(
			globInfo.startNode.position,
			globInfo.startNode.radius,
			globInfo.endNode.position,
			globInfo.endNode.radius,
			edgeType
		)

		// mid point, outer tangent edge, perp to that edge
		const midD = Vec.Lrp(outerTangentPoints[0], outerTangentPoints[1], 0.5)
		const outerLine = Vec.Sub(outerTangentPoints[0], outerTangentPoints[1]).uni()

		// infinite line of the perpendicular outer line
		const perpendicularOuterLine = Vec.Per(outerLine).uni()
		const normalDStart = Vec.Add(midD, Vec.Mul(perpendicularOuterLine, -INFINITE_LENGTH))
		const normalDEnd = Vec.Add(midD, Vec.Mul(perpendicularOuterLine, INFINITE_LENGTH))

		// check snap to the outer line
		let snappedToOuterLine = false
		const outerLineSnapPoint = Vec.NearestPointOnLineSegment(
			outerTangentPoints[0],
			outerTangentPoints[1],
			handle,
			false
		)
		const outerLineDistance = Vec.Dist(handle, outerLineSnapPoint)

		if (round(outerLineDistance) <= round(minDistance)) {
			if (round(outerLineDistance) < round(minDistance)) {
				minDistance = outerLineDistance
				nearestPoint = outerLineSnapPoint
			}
			snappedToOuterLine = true
		}

		// check snap to the perpendicular line
		let snappedToPerpLine = false
		const perpLineSnapPoint = Vec.NearestPointOnLineSegment(normalDStart, normalDEnd, handle, true)
		const perpLineDistance = Vec.Dist(handle, perpLineSnapPoint)

		if (round(perpLineDistance) <= round(minDistance)) {
			if (round(perpLineDistance) < round(minDistance)) {
				minDistance = perpLineDistance
				nearestPoint = perpLineSnapPoint
			}
			snappedToPerpLine = true
		}

		// if both outer line and perp line are snapped, snap to their intersection (midD)
		if (snappedToOuterLine && snappedToPerpLine) {
			nearestPoint = midD
		}

		// if no snap found, return null
		if (!nearestPoint) return null

		// transform to page space and calculate final snapped handle position
		const getShapePageTransform = this.editor.getShapePageTransform(shape.id)
		const handleInPageSpace = getShapePageTransform.applyToPoint(handle)
		const nearestPointInPageSpace = getShapePageTransform.applyToPoint(nearestPoint)

		const snappedHandle = Vec.Add(
			handleInPageSpace,
			Vec.Sub(nearestPointInPageSpace, handleInPageSpace)
		)

		const indicators: PointsSnapIndicator[] = endPoints.map((endPoint) => ({
			id: uniqueId(),
			type: 'points',
			points: [getShapePageTransform.applyToPoint(endPoint), snappedHandle],
		}))

		if (snappedToOuterLine) {
			indicators.push({
				id: uniqueId(),
				type: 'points',
				points: [
					getShapePageTransform.applyToPoint(outerTangentPoints[0]),
					getShapePageTransform.applyToPoint(outerTangentPoints[1]),
				],
			})
		}

		if (snappedToPerpLine) {
			indicators.push({
				id: uniqueId(),
				type: 'points',
				points: [snappedHandle, getShapePageTransform.applyToPoint(midD)],
			})
		}

		return {
			nudge: Vec.Sub(nearestPoint, handle),
			indicators,
		}
	}
}

function buildGlobPath(globPoints: GlobGeometry, geometry: boolean = false) {
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

export const GlobShape = track(function GlobShape({
	shape,
	showControlLines,
}: {
	shape: GlobShape
	showControlLines: boolean
}) {
	const editor = useEditor()
	const zoomLevel = editor.getZoomLevel()

	// Use reactive inputs to track if space key is pressed
	const fillGlob = useValue('space key pressed', () => editor.inputs.keys.has('Space'), [editor])

	const globPoints = getGlobInfo(editor, shape)
	if (!globPoints) return null

	const pathBuilder = buildGlobPath(globPoints)
	if (!pathBuilder) return null

	const dxA = toDomPrecision(shape.props.edges.edgeA.d.x)
	const dyA = toDomPrecision(shape.props.edges.edgeA.d.y)
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
					<ControlLine x1={dxA} y1={dyA} x2={txAA} y2={tyAA} />
					<ControlLine x1={dxA} y1={dyA} x2={txAB} y2={tyAB} />
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
})

export function ControlLine({
	x1,
	y1,
	x2,
	y2,
}: {
	x1: number
	y1: number
	x2: number
	y2: number
}) {
	const editor = useEditor()
	const zoomLevel = editor.getZoomLevel()
	const dashArray = `${3 / zoomLevel} ${3 / zoomLevel}`

	return (
		<line
			x1={x1}
			y1={y1}
			x2={x2}
			y2={y2}
			stroke="#4169E1"
			strokeDasharray={dashArray}
			strokeWidth={1 / zoomLevel}
		/>
	)
}

const getHandleData = (id: string) => {
	const [edgeType, point] = id.split('.') as [EdgeCurveType, keyof EdgeGeometry | keyof EdgeProps]

	return { edgeType, point }
}

export const getNeighborGlobs = (editor: Editor, shape: GlobShape) => {
	const currentGlobBindings = editor.getBindingsFromShape<GlobBinding>(shape.id, 'glob')

	const neighborGlobs: Set<GlobShape> = new Set()
	// try find nodes that attach to other globs
	for (const binding of currentGlobBindings) {
		const nodeBindings = editor.getBindingsToShape<GlobBinding>(binding.toId, 'glob')
		for (const nodeBinding of nodeBindings) {
			const neighborGlob = editor.getShape<GlobShape>(nodeBinding.fromId)

			// if this is the glob we selecting or a glob we've already added, skip
			if (!neighborGlob || neighborGlob.id === shape.id) continue
			if (neighborGlobs.has(neighborGlob)) continue

			neighborGlobs.add(neighborGlob)
		}
	}

	return neighborGlobs
}
