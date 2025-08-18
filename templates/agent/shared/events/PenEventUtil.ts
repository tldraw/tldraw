import { TLDrawShape, TLDrawShapeSegment } from 'tldraw'
import z from 'zod'
import { AgentTransform, ensureValueIsVec } from '../AgentTransform'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentPenEvent = z
	.object({
		_type: z.literal('pen'),
		intent: z.string(),
		points: z.array(
			z.object({
				x: z.number(),
				y: z.number(),
			})
		),
	})
	.meta({ title: 'Pen', description: 'The AI draws a freeform line with a pen.' })

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
		return event
	}

	override applyEvent(event: Streaming<IAgentPenEvent>, transform: AgentTransform) {
		const { editor } = transform

		if (!event.points) return
		if (event.points.length === 0) return

		const id = transform.getUniqueStreamingShapeId()
		if (event.complete) {
			transform.completeUniqueStreamingShapeId()
		}

		const startX = event.points[0].x
		const startY = event.points[0].y
		const segments: TLDrawShapeSegment[] = [
			{
				type: 'free',
				points: event.points.map((point) => ({
					x: point.x - startX,
					y: point.y - startY,
					z: 0.5,
				})),
			},
		]

		editor.createShape<TLDrawShape>({
			id,
			type: 'draw',
			x: startX,
			y: startY,
			props: {
				color: 'black',
				fill: 'none',
				dash: 'draw',
				segments,
				isComplete: true,
				isClosed: false,
				isPen: true,
				scale: 1,
			},
		})
	}
}
