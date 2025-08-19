import { createShapeId, TLDrawShape, TLDrawShapeSegment, Vec, VecModel } from 'tldraw'
import z from 'zod'
import {
	AgentTransform,
	ensureValueIsBoolean,
	ensureValueIsSimpleFill,
	ensureValueIsVec,
} from '../AgentTransform'
import { asColor, SimpleColor } from '../format/SimpleColor'
import { convertSimpleFillToTldrawFill, SimpleFill } from '../format/SimpleFill'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentPenEvent = z
	.object({
		_type: z.literal('pen'),
		color: SimpleColor,
		closed: z.boolean(),
		fill: SimpleFill,
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
			'The AI draws a freeform line with a pen. This is useful for drawing custom paths that are not available with the other available shapes. The "smooth" style will automatically smooth the line between points. The "straight" style will render a straight line between points. The "closed" property will determine if the drawn line gets automatically closed to form a complete shape or not. Remember that the pen will be *down* until the event is over. If you want to lift up the pen, start a new pen event.',
	})

type IAgentPenEvent = z.infer<typeof AgentPenEvent>

export class PenEventUtil extends AgentEventUtil<IAgentPenEvent> {
	static override type = 'pen' as const

	override getSchema() {
		return AgentPenEvent
	}

	override getIcon() {
		return 'pencil' as const
	}

	override getDescription(event: Streaming<IAgentPenEvent>) {
		return event.intent ?? ''
	}

	override transformEvent(event: Streaming<IAgentPenEvent>) {
		if (!event.points) return event

		const validPoints = event.points
			.map((point) => ensureValueIsVec(point))
			.filter((v) => v !== null)

		event.points = validPoints
		event.closed = ensureValueIsBoolean(event.closed) ?? false
		event.fill = ensureValueIsSimpleFill(event.fill) ?? 'none'

		return event
	}

	override applyEvent(event: Streaming<IAgentPenEvent>, transform: AgentTransform) {
		const { editor } = transform

		if (!event.points) return
		if (event.points.length === 0) return

		if (event.closed) {
			const firstPoint = event.points[0]
			event.points.push(firstPoint)
		}

		const minX = Math.min(...event.points.map((p) => p.x))
		const minY = Math.min(...event.points.map((p) => p.y))

		const points: VecModel[] = []
		const maxDistanceBetweenPoints = event.style === 'smooth' ? 10 : 2
		for (let i = 0; i < event.points.length - 1; i++) {
			const point = event.points[i]
			points.push(point)

			const nextPoint = event.points[i + 1]
			if (!nextPoint) continue

			const distance = Vec.Dist(point, nextPoint)
			const numPointsToAdd = Math.floor(distance / maxDistanceBetweenPoints)
			const pointsToAdd = Array.from({ length: numPointsToAdd }, (_, j) => {
				const t = (j + 1) / (numPointsToAdd + 1)
				return Vec.Lrp(point, nextPoint, t)
			})
			points.push(...pointsToAdd)
		}

		if (points.length === 0) {
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

		editor.createShape<TLDrawShape>({
			id: createShapeId(),
			type: 'draw',
			x: minX,
			y: minY,
			props: {
				color: asColor(event.color ?? 'black'),
				fill: convertSimpleFillToTldrawFill(event.fill ?? 'none'),
				dash: 'draw',
				segments,
				isComplete: event.complete,
				isClosed: event.closed,
				isPen: true,
			},
		})
	}
}
