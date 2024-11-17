import { Box, Vec } from 'tldraw'
import { Dot } from '../DebugComponents/Dot'
import { Line } from '../DebugComponents/Line'
import { getArrowGuide } from './getArrowNewPath'

export interface ArrowDebugInfo {
	startBounds: Box
	endBounds: Box
	centerBounds: Box
	M: Vec
}

export function ArrowGuideDisplay({ info }: { info: ArrowDebugInfo }) {
	const g = getArrowGuide({
		A: info.startBounds,
		B: info.endBounds,
		M: info.M,
		start: 'any',
		end: 'any',
		p: 32,
	})

	const points = g.grid.flat()

	const pathPoints = g.path.reduce((acc, p, i) => {
		if (i === 0) return acc
		return [...acc, [g.path[i - 1], p]]
	}, [] as Vec[][])

	return (
		<>
			{points.map((p, i) => (
				<Dot key={i + 'g'} point={p.vec} color="grey" />
			))}
			{pathPoints &&
				pathPoints.map((p, i) => <Line key={i + 'p'} p1={p[0]} p2={p[1]} color="black" />)}
		</>
	)
}
