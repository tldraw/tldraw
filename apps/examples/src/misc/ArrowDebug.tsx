import {
	Box,
	getArrowInfo,
	Mat,
	TLArrowBinding,
	TLArrowShape,
	useEditor,
	useValue,
	Vec,
} from 'tldraw'
import { ArrowDebugInfo } from './arrow-logic/ArrowGuideDisplay'
import { EXPAND_LEG_LENGTH } from './arrow-logic/constants'
import { ArrowNavigationGrid, getArrowNavigationGrid } from './arrow-logic/getArrowNavigationGrid'
import { getArrowPath } from './arrow-logic/getArrowPath'
import { Dot } from './DebugComponents/Dot'
import { Line } from './DebugComponents/Line'
import { Rect } from './DebugComponents/Rect'

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

					const middleHandleInShapeSpace = getArrowInfo(editor, arrow)?.middle

					if (!middleHandleInShapeSpace) return

					const shapePageTransform = editor.getShapePageTransform(arrow)!
					const middleHandleInPageSpace = Mat.applyToPoint(
						shapePageTransform,
						middleHandleInShapeSpace!
					)

					results.push({
						startBounds,
						endBounds,
						centerBounds,
						M: Vec.From(middleHandleInPageSpace),
					})
				})

			return results
		},
		[editor]
	)

	if (arrowInfos.length === 0) return null

	return arrowInfos.map((info, i) => <_ArrowDebugDisplay key={i} info={info} />)
}

function _ArrowDebugDisplay({ info }: { info: ArrowDebugInfo }) {
	const { startBounds: boxA, endBounds: boxB, M } = info

	const grid = getArrowNavigationGrid(boxA, boxB, M, EXPAND_LEG_LENGTH)

	const showGrid = false

	let path: Vec[] | undefined

	const sArrow = getArrowPath(grid)

	if (!sArrow.error) {
		path = sArrow.path
	}

	return (
		<>
			<div style={{ position: 'absolute', top: 0, left: 0, zIndex: 99991 }}>
				{showGrid && (
					<>
						<GridDisplay grid={grid} />
					</>
				)}
			</div>
			<div style={{ position: 'absolute', top: 0, left: 0, zIndex: 99992 }}>
				{path &&
					path
						.slice(1)
						.map((r, i) => (
							<Line key={i} p1={path[i]} p2={r} color="black" style="solid" width={4} />
						))}
			</div>
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
	// const brokenEdges = getBrokenEdges(g)

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
			{g.pathPoints.includes(g.D.tl) && <Dot point={g.D.tl} color="grey" />}
			{g.pathPoints.includes(g.D.tr) && <Dot point={g.D.tr} color="grey" />}
			{g.pathPoints.includes(g.D.br) && <Dot point={g.D.br} color="grey" />}
			{g.pathPoints.includes(g.D.bl) && <Dot point={g.D.bl} color="grey" />}

			{g.pathPoints.includes(g.D.tc) && <Dot point={g.D.tc} color="green" />}
			{g.pathPoints.includes(g.D.rc) && <Dot point={g.D.rc} color="green" />}
			{g.pathPoints.includes(g.D.bc) && <Dot point={g.D.bc} color="green" />}
			{g.pathPoints.includes(g.D.lc) && <Dot point={g.D.lc} color="green" />}

			{g.pathPoints.includes(g.D.tcl) && <Dot point={g.D.tcl} color="orange" />}
			{g.pathPoints.includes(g.D.tcr) && <Dot point={g.D.tcr} color="orange" />}
			{g.pathPoints.includes(g.D.lct) && <Dot point={g.D.lct} color="orange" />}
			{g.pathPoints.includes(g.D.lcb) && <Dot point={g.D.lcb} color="orange" />}
			{g.pathPoints.includes(g.D.bcr) && <Dot point={g.D.bcr} color="orange" />}
			{g.pathPoints.includes(g.D.bcl) && <Dot point={g.D.bcl} color="orange" />}
			{g.pathPoints.includes(g.D.rct) && <Dot point={g.D.rct} color="orange" />}
			{g.pathPoints.includes(g.D.rcb) && <Dot point={g.D.rcb} color="orange" />}

			{/* C center */}
			{g.pathPoints.includes(g.C.c) && <Dot point={g.C.c} color="purple" />}

			{/* C bounds */}
			{g.pathPoints.includes(g.C.t) && <Dot point={g.C.t} color="green" />}
			{g.pathPoints.includes(g.C.b) && <Dot point={g.C.b} color="green" />}
			{g.pathPoints.includes(g.C.l) && <Dot point={g.C.l} color="green" />}

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
			{/* <Dot point={g.A.e.tl} color="salmon" />
			<Dot point={g.A.e.tr} color="salmon" />
			<Dot point={g.A.e.br} color="salmon" />
			<Dot point={g.A.e.bl} color="salmon" /> */}

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
			{/* <Dot point={g.B.e.tl} color="salmon" />
			<Dot point={g.B.e.tr} color="salmon" />
			<Dot point={g.B.e.br} color="salmon" />
			<Dot point={g.B.e.bl} color="salmon" /> */}

			{/* edges */}
			<Rect p1={g.D.tl} p2={g.D.br} color="orange" />
			<Rect p1={g.C.tl} p2={g.C.br} color="blue" />
			<Line p1={g.D.tc} p2={g.D.bc} color="green" />
			<Line p1={g.D.lc} p2={g.D.rc} color="green" />
			<Rect p1={g.A.e.tl} p2={g.A.e.br} color="orange" />
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
			{/* {brokenEdges.error === false && (
				<><Line p1={brokenEdgeA.p1} p2={brokenEdgeA.p2} color="red" style="solid" width={4} />
				<Line p1={brokenEdgeB.p1} p2={brokenEdgeB.p2} color="red" style="solid" width={4} />
			)} */}
		</>
	)
}
