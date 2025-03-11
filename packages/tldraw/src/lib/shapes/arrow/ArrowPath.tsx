import { exhaustiveSwitchError, TLArrowShape } from '@tldraw/editor'
import { SvgPathBuilder, SvgPathBuilderOpts } from '../shared/SvgPathBuilder'
import { TLArrowInfo } from './arrow-types'
import { getRouteHandlePath } from './elbow/getElbowArrowInfo'

export function getArrowBodyPath(shape: TLArrowShape, info: TLArrowInfo, opts: SvgPathBuilderOpts) {
	const startHasArrowhead = shape.props.arrowheadStart !== 'none'
	const endHasArrowhead = shape.props.arrowheadEnd !== 'none'

	switch (info.type) {
		case 'straight':
			return new SvgPathBuilder()
				.moveTo(info.start.point.x, info.start.point.y, { offset: 0, roundness: 0 })
				.lineTo(info.end.point.x, info.end.point.y, { offset: 0, roundness: 0 })
				.build(opts)
		case 'arc':
			return new SvgPathBuilder()
				.moveTo(info.start.point.x, info.start.point.y, { offset: 0, roundness: 0 })
				.arcTo(
					info.bodyArc.radius,
					!!info.bodyArc.largeArcFlag,
					!!info.bodyArc.sweepFlag,
					info.end.point.x,
					info.end.point.y,
					{ offset: 0, roundness: 0 }
				)
				.build(opts)
		case 'elbow': {
			const path = new SvgPathBuilder()
			path.moveTo(info.start.point.x, info.start.point.y, {
				offset: startHasArrowhead ? 0 : undefined,
			})
			for (let i = 1; i < info.route.points.length; i++) {
				const point = info.route.points[i]
				path.lineTo(point.x, point.y, {
					offset: i === info.route.points.length - 1 && endHasArrowhead ? 0 : undefined,
				})
			}
			return path.build(opts)
		}
		default:
			exhaustiveSwitchError(info, 'type')
	}
}

export function getArrowHandlePath(info: TLArrowInfo, opts: SvgPathBuilderOpts) {
	switch (info.type) {
		case 'straight':
			return new SvgPathBuilder()
				.moveTo(info.start.handle.x, info.start.handle.y)
				.lineTo(info.end.handle.x, info.end.handle.y)
				.build(opts)
		case 'arc':
			return new SvgPathBuilder()
				.moveTo(info.start.handle.x, info.start.handle.y)
				.arcTo(
					info.handleArc.radius,
					!!info.handleArc.largeArcFlag,
					!!info.handleArc.sweepFlag,
					info.end.handle.x,
					info.end.handle.y
				)
				.build(opts)
		case 'elbow': {
			const handleRoute = getRouteHandlePath(info.elbow, info.route)
			return SvgPathBuilder.throughPoints(handleRoute.points).build(opts)
		}
		default:
			exhaustiveSwitchError(info, 'type')
	}
}
