import { exhaustiveSwitchError, TLArrowShape } from '@tldraw/editor'
import { PathBuilder, PathBuilderOpts } from '../shared/PathBuilder'
import { TLArrowInfo } from './arrow-types'
import { getRouteHandlePath } from './elbow/getElbowArrowInfo'

export function getArrowBodyPath(shape: TLArrowShape, info: TLArrowInfo, opts: PathBuilderOpts) {
	switch (info.type) {
		case 'straight':
			return new PathBuilder()
				.moveTo(info.start.point.x, info.start.point.y, { offset: 0, roundness: 0 })
				.lineTo(info.end.point.x, info.end.point.y, { offset: 0, roundness: 0 })
				.toSvg(opts)
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
				.toSvg(opts)
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
			return path.toSvg(opts)
		}
		default:
			exhaustiveSwitchError(info, 'type')
	}
}

export function getArrowHandlePath(info: TLArrowInfo, opts: PathBuilderOpts) {
	switch (info.type) {
		case 'straight':
			return new PathBuilder()
				.moveTo(info.start.handle.x, info.start.handle.y)
				.lineTo(info.end.handle.x, info.end.handle.y)
				.toSvg(opts)
		case 'arc':
			return new PathBuilder()
				.moveTo(info.start.handle.x, info.start.handle.y)
				.circularArcTo(
					info.handleArc.radius,
					!!info.handleArc.largeArcFlag,
					!!info.handleArc.sweepFlag,
					info.end.handle.x,
					info.end.handle.y
				)
				.toSvg(opts)
		case 'elbow': {
			const handleRoute = getRouteHandlePath(info.elbow, info.route)
			return PathBuilder.lineThroughPoints(handleRoute.points).toSvg(opts)
		}
		default:
			exhaustiveSwitchError(info, 'type')
	}
}
