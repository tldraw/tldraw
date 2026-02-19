import {
	Editor,
	isEqualAllowingForFloatingPointErrors,
	TLArrowShape,
	TLShapeId,
} from '@tldraw/editor'
import { createComputedCache } from '@tldraw/store'
import { TLArrowInfo } from './arrow-types'
import { getCurvedArrowInfo } from './curved-arrow'
import { getElbowArrowInfo } from './elbow/getElbowArrowInfo'
import { getArrowBindings, getIsArrowStraight } from './shared'
import { getStraightArrowInfo } from './straight-arrow'

const arrowInfoCache = createComputedCache<Editor, TLArrowInfo, TLArrowShape>(
	'arrow info',
	(editor: Editor, shape: TLArrowShape): TLArrowInfo => {
		const bindings = getArrowBindings(editor, shape)
		if (shape.props.kind === 'elbow') {
			const elbowInfo = getElbowArrowInfo(editor, shape, bindings)
			if (!elbowInfo?.route) return getStraightArrowInfo(editor, shape, bindings)

			const start = elbowInfo.swapOrder ? elbowInfo.B : elbowInfo.A
			const end = elbowInfo.swapOrder ? elbowInfo.A : elbowInfo.B

			return {
				type: 'elbow',
				bindings,
				start: {
					handle: start.target,
					point: elbowInfo.route.points[0],
					arrowhead: shape.props.arrowheadStart,
				},
				end: {
					handle: end.target,
					point: elbowInfo.route.points[elbowInfo.route.points.length - 1],
					arrowhead: shape.props.arrowheadEnd,
				},
				elbow: elbowInfo,
				route: elbowInfo.route,
				isValid: true,
			}
		}

		if (getIsArrowStraight(shape)) {
			return getStraightArrowInfo(editor, shape, bindings)
		} else {
			return getCurvedArrowInfo(editor, shape, bindings)
		}
	},
	{
		areRecordsEqual: (a, b) => a.props === b.props,
		areResultsEqual: isEqualAllowingForFloatingPointErrors,
	}
)

/** @public */
export function getArrowInfo(editor: Editor, shape: TLArrowShape | TLShapeId) {
	const id = typeof shape === 'string' ? shape : shape.id
	return arrowInfoCache.get(editor, id)
}
