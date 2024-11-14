import { Box, TLArrowBinding, TLArrowShape, useEditor, useValue, Vec } from 'tldraw'
import { EXPAND_LEG_LENGTH } from './arrow-logic/constants'
import { ArrowNavigationGrid, getArrowNavigationGrid } from './arrow-logic/getArrowNavigationGrid'
import { getBrokenEdge } from './arrow-logic/getBrokenEdge'
import { getSArrow } from './arrow-logic/s-arrow'
import { Dot } from './DebugComponents/Dot'
import { Line } from './DebugComponents/Line'
import { Rect } from './DebugComponents/Rect'

interface ArrowDebugInfo {
	startBounds: Box
	endBounds: Box
	centerBounds: Box
}

export function AllArrowsDebugDisplay() {
	const editor = useEditor()
	const arrowInfos = useValue(
		'arrowShapes',
		() => {
			const results: ArrowDebugInfo[] = []

			editor
				.getCurrentPageShapesSorted()
				.filter((s) => editor.isShapeOfType<TLArrowShape>(s, 'arrow'))
				.forEach((arrow) => {
					const bindings = editor.getBindingsFromShape(arrow, 'arrow') as TLArrowBinding[]
					if (bindings.length === 0) return
					if (bindings.length === 1) return

					const startBinding = bindings.find((b) => b.props.terminal === 'start')
					if (!startBinding) return
					const startShape = editor.getShape(startBinding.toId)
					if (!startShape) return
					const startBounds = editor.getShapePageBounds(startShape)
					if (!startBounds) return

					const endBinding = bindings.find((b) => b.props.terminal === 'end')
					if (!endBinding) return
					const endShape = editor.getShape(endBinding.toId)
					if (!endShape) return
					const endBounds = editor.getShapePageBounds(endShape)
					if (!endBounds) return

					const centerBounds = Box.FromPoints([startBounds.center, endBounds.center])

					results.push({
						startBounds,
						endBounds,
						centerBounds,
					})
				})

			return results
		},
		[editor]
	)

	if (arrowInfos.length === 0) return null

	return arrowInfos.map((info, i) => <ArrowDebugDisplay key={i} info={info} />)
}

function ArrowDebugDisplay({ info }: { info: ArrowDebugInfo }) {
	const { startBounds: boxA, endBounds: boxB } = info

	const grid = getArrowNavigationGrid(boxA, boxB, EXPAND_LEG_LENGTH)

	// // try S arrow

	// let arrowPath: Vec[] | undefined

	// const dirResult = getStartingDirectionForArrow(boxA, boxB)

	// if (dirResult.error !== false) {
	// 	throw Error('no direction')
	// }

	// const { dir } = dirResult

	// const sArrowResult = getSArrow(boxA, boxB, dir)
	// if (sArrowResult.error === false) {
	// 	arrowPath = sArrowResult.path
	// } else if (
	// 	sArrowResult.error === sArrowErrors.SHORT_OUTSIDE_LEGS ||
	// 	sArrowResult.error === sArrowErrors.POINT_BOX_OVERLAP
	// ) {
	// 	const lResult = getLArrow(boxA, boxB)
	// 	if (lResult.error === false) {
	// 		arrowPath = lResult.path
	// 	} else {
	// 		// Whatever the error, we go with a C arrow
	// 	}
	// 	// ...
	// } else if (sArrowResult.error === sArrowErrors.SHORT_MIDDLE_LEG) {
	// 	const dir = Vec.Sub(sArrowResult.path[1], sArrowResult.path[0]).uni()
	// 	const iResult = getIArrow(dir, boxA, boxB)
	// 	if (iResult.error === false) {
	// 		arrowPath = iResult.path
	// 	}
	// }

	const showGrid = true

	return (
		<>
			{showGrid && (
				<>
					<GridDisplay grid={grid} />
				</>
			)}
			{/* {arrowPath &&
				arrowPath.map((r, i) => {
					if (i === 0) {
						return
					}
					return (
						<>
							<Line
								key={i}
								x1={arrowPath[i - 1].x}
								y1={arrowPath[i - 1].y}
								x2={r.x}
								y2={r.y}
								style="solid"
								color="green"
							/>
							<Dot key={i + 'd'} x={r.x} y={r.y} color="green" />
						</>
					)
				})} */}
		</>
	)
}

function GridDisplay({ grid: g }: { grid: ArrowNavigationGrid }) {
	const brokenEdgeA = getBrokenEdge(g, g.A.box)
	const brokenEdgeB = getBrokenEdge(g, g.B.box)

	let path: Vec[] | undefined

	const sArrow = getSArrow(g)

	if (!sArrow.error) {
		path = sArrow.path
	}

	return (
		<>
			{/* Gap H */}
			<Rect
				p1={g.gap.h.corners[0]}
				p2={g.gap.h.corners[2]}
				color="rgba(255,0,0,.05)"
				style="solid"
				fill
				stroke={false}
			/>
			<Rect
				p1={g.gap.v.corners[0]}
				p2={g.gap.v.corners[2]}
				color="rgba(0,0,255,.05)"
				style="solid"
				fill
				stroke={false}
			/>

			{/* D bounds */}
			<Dot point={g.D.tl} color="grey" />
			<Dot point={g.D.tr} color="grey" />
			<Dot point={g.D.br} color="grey" />
			<Dot point={g.D.bl} color="grey" />

			<Dot point={g.D.tc} color="green" />
			<Dot point={g.D.rc} color="green" />
			<Dot point={g.D.bc} color="green" />
			<Dot point={g.D.lc} color="green" />

			<Dot point={g.D.tcl} color="orange" />
			<Dot point={g.D.tcr} color="orange" />
			<Dot point={g.D.lct} color="orange" />
			<Dot point={g.D.lcb} color="orange" />
			<Dot point={g.D.bcr} color="orange" />
			<Dot point={g.D.bcl} color="orange" />
			<Dot point={g.D.rct} color="orange" />
			<Dot point={g.D.rcb} color="orange" />

			{/* C center */}
			<Dot point={g.C.c} color="purple" />

			{/* C bounds */}
			<Dot point={g.C.t} color="green" />
			<Dot point={g.C.r} color="green" />
			<Dot point={g.C.b} color="green" />
			<Dot point={g.C.l} color="green" />

			{/* C corners */}
			<Dot point={g.C.tl} color="blue" />
			<Dot point={g.C.tr} color="blue" />
			<Dot point={g.C.br} color="blue" />
			<Dot point={g.C.bl} color="blue" />

			{/* A bounds */}
			<Dot point={g.A.c} color="purple" />
			<Dot point={g.A.t} color="red" />
			<Dot point={g.A.r} color="red" />
			<Dot point={g.A.b} color="red" />
			<Dot point={g.A.l} color="red" />

			{/* A expanded bounds */}
			<Dot point={g.A.e.t} color="salmon" />
			<Dot point={g.A.e.r} color="salmon" />
			<Dot point={g.A.e.b} color="salmon" />
			<Dot point={g.A.e.l} color="salmon" />
			<Dot point={g.A.e.tl} color="salmon" />
			<Dot point={g.A.e.tr} color="salmon" />
			<Dot point={g.A.e.br} color="salmon" />
			<Dot point={g.A.e.bl} color="salmon" />

			{/* B bounds */}
			<Dot point={g.B.c} color="purple" />
			<Dot point={g.B.t} color="red" />
			<Dot point={g.B.r} color="red" />
			<Dot point={g.B.b} color="red" />
			<Dot point={g.B.l} color="red" />

			{/* B expanded bounds */}
			<Dot point={g.B.e.t} color="salmon" />
			<Dot point={g.B.e.r} color="salmon" />
			<Dot point={g.B.e.b} color="salmon" />
			<Dot point={g.B.e.l} color="salmon" />
			<Dot point={g.B.e.tl} color="salmon" />
			<Dot point={g.B.e.tr} color="salmon" />
			<Dot point={g.B.e.br} color="salmon" />
			<Dot point={g.B.e.bl} color="salmon" />

			{/* edges */}
			<Rect p1={g.D.tl} p2={g.D.br} color="orange" />
			<Rect p1={g.C.tl} p2={g.C.br} color="blue" />
			<Line p1={g.D.tc} p2={g.D.bc} color="green" />
			<Line p1={g.D.lc} p2={g.D.rc} color="green" />
			<Rect p1={g.B.e.tl} p2={g.B.e.br} color="orange" />
			<Line p1={g.C.tl} p2={g.D.tcl} color="orange" />
			<Line p1={g.C.tl} p2={g.D.lct} color="orange" />
			<Line p1={g.C.tr} p2={g.D.tcr} color="orange" />
			<Line p1={g.C.tr} p2={g.D.rct} color="orange" />
			<Line p1={g.C.bl} p2={g.D.bcl} color="orange" />
			<Line p1={g.C.bl} p2={g.D.lcb} color="orange" />
			<Line p1={g.C.br} p2={g.D.bcr} color="orange" />
			<Line p1={g.C.br} p2={g.D.rcb} color="orange" />

			{/* Broken edges */}
			{brokenEdgeA.error === false && (
				<Line p1={brokenEdgeA.p1} p2={brokenEdgeA.p2} color="red" style="solid" width={4} />
			)}
			{brokenEdgeB.error === false && (
				<Line p1={brokenEdgeB.p1} p2={brokenEdgeB.p2} color="red" style="solid" width={4} />
			)}

			{path &&
				path
					.slice(1)
					.map((r, i) => <Line key={i} p1={path[i]} p2={r} color="red" style="solid" width={4} />)}
		</>
	)
}
