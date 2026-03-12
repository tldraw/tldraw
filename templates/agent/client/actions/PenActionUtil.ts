import { b64Vecs, TLDrawShapeSegment, TLShapeId, Vec, VecModel } from 'tldraw'
import { asColor } from '../../shared/format/FocusedColor'
import { convertFocusedFillToTldrawFill } from '../../shared/format/FocusedFill'
import { PenAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const PenActionUtil = registerActionUtil(
	class PenActionUtil extends AgentActionUtil<PenAction> {
		static override type = 'pen' as const

		override getInfo(action: Streaming<PenAction>) {
			return {
				icon: 'pencil' as const,
				description: action.intent ?? '',
			}
		}

		override sanitizeAction(action: Streaming<PenAction>, helpers: AgentHelpers) {
			if (!action.points) return action

			// Ensure the shape has a unique ID
			action.shapeId = helpers.ensureShapeIdIsUnique(action.shapeId)

			// Don't include the final point if we're still streaming.
			// Its numbers might be incomplete.
			const points = action.complete ? action.points : action.points.slice(0, -1)

			// This is a complex action for the model, so validate the data it gives us
			const validPoints = points
				.map((point) => helpers.ensureValueIsVec(point))
				.filter((v) => v !== null)

			action.points = validPoints
			action.closed = helpers.ensureValueIsBoolean(action.closed) ?? false
			action.fill = helpers.ensureValueIsFocusedFill(action.fill) ?? 'none'

			return action
		}

		override applyAction(action: Streaming<PenAction>, helpers: AgentHelpers) {
			if (!action.points) return
			if (action.points.length === 0) return

			if (!action.shapeId) return
			const shapeId = `shape:${action.shapeId}` as TLShapeId

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

			// Require at least 2 points to draw a line
			if (points.length <= 1) {
				return
			}

			const segmentPoints = points.map((point) => ({
				x: point.x - minX,
				y: point.y - minY,
				z: 0.75,
			}))
			const base64Points = b64Vecs.encodePoints(segmentPoints)

			const segments: TLDrawShapeSegment[] = [
				{
					type: 'free',
					path: base64Points,
				},
			]

			this.editor.createShape({
				id: shapeId,
				type: 'draw',
				x: minX,
				y: minY,
				isLocked: !action.complete,
				props: {
					color: asColor(action.color ?? 'black'),
					fill: convertFocusedFillToTldrawFill(action.fill ?? 'none'),
					dash: 'draw',
					size: 's',
					segments,
					isComplete: action.complete,
					isClosed: action.closed,
					isPen: true,
				},
			})
		}
	}
)
