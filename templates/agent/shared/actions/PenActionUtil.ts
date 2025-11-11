import { createShapeId, TLDrawShape, TLDrawShapeSegment, Vec, VecModel } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { asColor, SimpleColor } from '../format/SimpleColor'
import { convertSimpleFillToTldrawFill, SimpleFillSchema } from '../format/SimpleFill'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const PenAction = z
	.object({
		_type: z.literal('pen'),
		color: SimpleColor,
		closed: z.boolean(),
		fill: SimpleFillSchema,
		intent: z.string(),
		points: z.array(
			z.object({
				x: z.number(),
				y: z.number(),
			})
		),
		style: z.enum(['smooth', 'straight']),
	})
	.meta({
		title: 'Pen',
		description:
			'The AI draws a freeform line with a pen. This is useful for drawing custom paths that are not available with the other available shapes. The "smooth" style will automatically smooth the line between points. The "straight" style will render a straight line between points. The "closed" property will determine if the drawn line gets automatically closed to form a complete shape or not. Remember that the pen will be *down* until the action is over. If you want to lift up the pen, start a new pen action.',
	})

type PenAction = z.infer<typeof PenAction>

export class PenActionUtil extends AgentActionUtil<PenAction> {
	static override type = 'pen' as const

	override getSchema() {
		return PenAction
	}

	override getInfo(action: Streaming<PenAction>) {
		return {
			icon: 'pencil' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<PenAction>, helpers: AgentHelpers) {
		if (!action.points) return action

		// Don't include the final point if we're still streaming.
		// Its numbers might be incomplete.
		const points = action.complete ? action.points : action.points.slice(0, -1)

		// This is a complex action for the model, so validate the data it gives us
		const validPoints = points
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
		// Add the last point
		if (action.points.length > 0) {
			points.push(action.points[action.points.length - 1])
		}

		if (points.length === 0) {
			return
		}

		// Convert points to shape space (relative to minX, minY)
		const shapeSpacePoints: VecModel[] = points.map((point) => ({
			x: point.x - minX,
			y: point.y - minY,
			z: 0.75,
		}))

		// Convert to segment format: firstPoint + deltas
		const zoom = this.agent.editor.getZoomLevel()
		const firstPoint = shapeSpacePoints[0]
		const deltas: number[] = []
		let px = firstPoint.x
		let py = firstPoint.y
		let pz = firstPoint.z ?? 0.5

		for (let i = 1; i < shapeSpacePoints.length; i++) {
			const point = shapeSpacePoints[i]
			const dx = point.x - px
			const dy = point.y - py
			const dz = (point.z ?? 0.5) - pz
			deltas.push(Math.round(dx * 10))
			deltas.push(Math.round(dy * 10))
			deltas.push(Math.round(dz * 10))
			px += dx
			py += dy
			pz += dz
		}

		const segments: TLDrawShapeSegment[] = [
			{
				type: 'free',
				firstPoint: { x: firstPoint.x, y: firstPoint.y, z: firstPoint.z ?? 0.5 },
				points: deltas,
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
				zoom,
			},
		})
	}
}
