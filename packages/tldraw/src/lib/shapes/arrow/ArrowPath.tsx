import { exhaustiveSwitchError, TLArrowShape } from '@tldraw/editor'
import { PathBuilder, PathBuilderOpts } from '../shared/PathBuilder'
import { TLArrowInfo } from './arrow-types'

export function getArrowBodyPathBuilder(info: TLArrowInfo): PathBuilder {
	switch (info.type) {
		case 'straight':
			return new PathBuilder()
				.moveTo(info.start.point.x, info.start.point.y, { offset: 0, roundness: 0 })
				.lineTo(info.end.point.x, info.end.point.y, { offset: 0, roundness: 0 })
		case 'arc':
			return new PathBuilder()
				.moveTo(info.start.point.x, info.start.point.y, { offset: 0, roundness: 0 })
				.circularArcTo(
					info.bodyArc.radius,
					!!info.bodyArc.largeArcFlag,
					!!info.bodyArc.sweepFlag,
					info.end.point.x,
					info.end.point.y,
					{ offset: 0, roundness: 0 }
				)
		case 'elbow': {
			const path = new PathBuilder()
			path.moveTo(info.start.point.x, info.start.point.y, {
				offset: 0,
			})
			for (let i = 1; i < info.route.points.length; i++) {
				const point = info.route.points[i]
				if (info.route.skipPointsWhenDrawing.has(point)) {
					continue
				}
				path.lineTo(point.x, point.y, {
					offset: i === info.route.points.length - 1 ? 0 : undefined,
				})
			}
			return path
		}
		default:
			exhaustiveSwitchError(info, 'type')
	}
}

export function getArrowBodyPath(shape: TLArrowShape, info: TLArrowInfo, opts: PathBuilderOpts) {
	return getArrowBodyPathBuilder(info).toSvg(opts)
}
