import { PenAction, Streaming, asColor, convertSimpleFillToTldrawFill } from '@tldraw/fairy-shared'
import { TLDrawShape, TLDrawShapeSegment, Vec, VecModel, createShapeId, last } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class PenActionUtil extends AgentActionUtil<PenAction> {
	static override type = 'pen' as const

	override getInfo(action: Streaming<PenAction>) {
		return {
			icon: 'pencil' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<PenAction>, helpers: AgentHelpers) {
		if (!action.points) return action

		// This is a complex action for the model, so validate the data it gives us
		const validPoints = action.points
			.map((point) => helpers.ensureValueIsVec(point))
			.filter((v) => v !== null)

		action.points = validPoints
		action.closed = helpers.ensureValueIsBoolean(action.closed) ?? false
		action.fill = helpers.ensureValueIsSimpleFill(action.fill) ?? 'none'

		return action
	}

	override applyAction(action: Streaming<PenAction>, helpers: AgentHelpers) {
		if (!this.agent) return

		if (!action.points) return
		if (action.points.length === 0) return

		action.points = action.points.map((point) => helpers.removeOffsetFromVec(point))

		if (action.closed) {
			const firstPoint = action.points[0]
			action.points.push(firstPoint)
		}

		const minX = Math.min(...action.points.map((p) => p.x))
		const minY = Math.min(...action.points.map((p) => p.y))

		const points: VecModel[] = []
		const maxDistanceBetweenPoints = action.style === 'smooth' ? 10 : 2
		for (let i = 0; i < action.points.length - 1; i++) {
			const point = action.points[i]
			points.push(point)

			const nextPoint = action.points[i + 1]
			if (!nextPoint) continue

			const distance = Vec.Dist(point, nextPoint)
			const numPointsToAdd = Math.floor(distance / maxDistanceBetweenPoints)
			const pointsToAdd = Array.from({ length: numPointsToAdd }, (_, j) => {
				const t = (j + 1) / (numPointsToAdd + 1)
				return Vec.Lrp(point, nextPoint, t)
			})
			points.push(...pointsToAdd)
		}

		if (points.length <= 1) {
			return
		}

		const segments: TLDrawShapeSegment[] = [
			{
				type: 'free',
				points: points.map((point) => ({
					x: point.x - minX,
					y: point.y - minY,
					z: 0.75,
				})),
			},
		]

		this.agent.editor.createShape<TLDrawShape>({
			id: createShapeId(),
			type: 'draw',
			x: minX,
			y: minY,
			props: {
				color: asColor(action.color ?? 'black'),
				fill: convertSimpleFillToTldrawFill(action.fill ?? 'none'),
				dash: 'draw',
				size: 's',
				segments,
				isComplete: action.complete,
				isClosed: action.closed,
				isPen: true,
			},
		})

		const lastPoint = last(points)
		if (!lastPoint) return
		this.agent.moveToPosition({
			x: lastPoint.x,
			y: lastPoint.y,
		})
	}
}
