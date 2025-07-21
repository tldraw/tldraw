import { TLAiChange, TLAiPrompt, TldrawAiTransform } from '@tldraw/ai'
import { Box, TLShapePartial } from 'tldraw'

export class SimpleCoordinates extends TldrawAiTransform {
	before: Record<string, number> = {}
	bounds = {} as Box

	private setBeforeNumberValue(id: string, prop: string, value: number) {
		this.before[id + '_' + prop] = value
	}

	private getBeforeNumberValue(id: string, prop: string) {
		return this.before[id + '_' + prop]
	}

	override transformPrompt = (input: TLAiPrompt) => {
		const { canvasContent, promptBounds, contextBounds } = input
		// Save the original coordinates of context bounds (the user's viewport)
		this.bounds = contextBounds.clone()

		// Save the original coordinates of all shapes
		for (const shape of canvasContent.shapes) {
			// Stash the original coordinates
			this.setBeforeNumberValue(shape.id, 'x', shape.x)
			this.setBeforeNumberValue(shape.id, 'y', shape.y)

			// Subtract the context bounds from the shape coordinates
			shape.x = Math.floor(shape.x - this.bounds.x)
			shape.y = Math.floor(shape.y - this.bounds.y)
		}

		for (const key in input.meta.context.areas) {
			const area = input.meta.context.areas[key]

			this.setBeforeNumberValue(key, 'x', area.x)
			this.setBeforeNumberValue(key, 'y', area.y)

			area.x = Math.floor(area.x - this.bounds.x)
			area.y = Math.floor(area.y - this.bounds.y)
		}

		// Make the prompt bounds relative to the context bounds
		promptBounds.x -= contextBounds.x
		promptBounds.y -= contextBounds.y

		// Zero the context bounds
		contextBounds.x = 0
		contextBounds.y = 0

		return input
	}

	override transformChange = (change: TLAiChange) => {
		switch (change.type) {
			case 'createShape':
			case 'updateShape': {
				const { shape } = change
				const { x: nextX, y: nextY } = shape

				// Restore the original x and y coordinates
				if (nextX !== undefined) {
					// If the model came back with an x coordinate, add back in the offset that we subtracted earlier
					shape.x = nextX + this.bounds.x
				} else {
					shape.x = this.getBeforeNumberValue(shape.id, 'x')
				}

				if (nextY !== undefined) {
					// If the model came back with a y coordinate, add back in the offset that we subtracted earlier
					shape.y = nextY + this.bounds.y
				} else {
					shape.y = this.getBeforeNumberValue(shape.id, 'y')
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
