import { TLAiChange, TLAiPrompt, TldrawAiTransform } from '@tldraw/ai'
import { Box, TLShapePartial } from 'tldraw'

// This transform does *not* change the offset of the shapes, it only rounds positions to the nearest integer.
// This is important in the agent usecase because the agent was sometimes 'leaking' coordinates into chat history via thoughts and messages,
// which confused the model later on after we changed the coordinates of the shapes.
export class SimplishCoordinates extends TldrawAiTransform {
	diff: Record<string, number> = {}
	bounds = {} as Box

	private setRoundingDiff(id: string, prop: string, value: number) {
		this.diff[id + '_' + prop] = value
	}

	private getRoundingDiff(id: string, prop: string): number | undefined {
		return this.diff[id + '_' + prop]
	}

	override transformPrompt = (input: TLAiPrompt) => {
		const { canvasContent } = input

		// Save the original coordinates of all shapes
		for (const shape of canvasContent.shapes) {
			const roundedX = Math.floor(shape.x)
			const roundedY = Math.floor(shape.y)
			this.setRoundingDiff(shape.id, 'x', roundedX - shape.x)
			this.setRoundingDiff(shape.id, 'y', roundedY - shape.y)
			shape.x = roundedX
			shape.y = roundedY
		}

		for (const key in input.meta.contextItems.areas) {
			const area = input.meta.contextItems.areas[key]
			const roundedX = Math.floor(area.x)
			const roundedY = Math.floor(area.y)
			this.setRoundingDiff(key, 'x', roundedX - area.x)
			this.setRoundingDiff(key, 'y', roundedY - area.y)
			area.x = roundedX
			area.y = roundedY
		}

		for (const key in input.meta.contextItems.points) {
			const point = input.meta.contextItems.points[key]
			const roundedX = Math.floor(point.x)
			const roundedY = Math.floor(point.y)
			this.setRoundingDiff(key, 'x', roundedX - point.x)
			this.setRoundingDiff(key, 'y', roundedY - point.y)
			point.x = roundedX
			point.y = roundedY
		}

		return input
	}

	override transformChange = (change: TLAiChange) => {
		switch (change.type) {
			case 'createShape':
			case 'updateShape': {
				const { shape } = change

				const diffX = this.getRoundingDiff(shape.id, 'x') ?? 0
				const diffY = this.getRoundingDiff(shape.id, 'y') ?? 0

				if (shape.x !== undefined) {
					shape.x = shape.x + diffX
				}
				if (shape.y !== undefined) {
					shape.y = shape.y + diffY
				}

				return {
					...change,
					shape: shape as TLShapePartial,
				}
			}
			default: {
				return change
			}
		}
	}
}
