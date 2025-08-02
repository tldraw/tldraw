import { TLAiChange, TldrawAiTransform } from '@tldraw/ai'
import { Box, TLShapePartial } from 'tldraw'
import { TLAgentPrompt } from '../types/TLAgentPrompt'

// This transform does *not* change the offset of the shapes, it only rounds positions to the nearest integer.
// This is important in the agent usecase because the agent was sometimes 'leaking' coordinates into chat history via thoughts and messages,
// which confused the model later on after we changed the coordinates of the shapes.
export class RoundedCoordinates extends TldrawAiTransform {
	diff: Record<string, number> = {}
	bounds = {} as Box

	private setRoundingDiff(id: string, prop: string, value: number) {
		this.diff[id + '_' + prop] = value
	}

	private getRoundingDiff(id: string, prop: string): number | undefined {
		return this.diff[id + '_' + prop]
	}

	override transformPrompt = (input: TLAgentPrompt) => {
		const { canvasContent, meta } = input
		const { currentPageShapes, currentUserViewportBounds, contextItems } = meta

		// Save the original coordinates of all shapes
		for (const shape of canvasContent.shapes) {
			const roundedX = Math.floor(shape.x)
			const roundedY = Math.floor(shape.y)
			this.setRoundingDiff(shape.id, 'x', roundedX - shape.x)
			this.setRoundingDiff(shape.id, 'y', roundedY - shape.y)
			shape.x = roundedX
			shape.y = roundedY
		}

		for (const shape of currentPageShapes) {
			const roundedX = Math.floor(shape.x)
			const roundedY = Math.floor(shape.y)
			shape.x = roundedX
			shape.y = roundedY
		}

		for (const contextItem of contextItems) {
			switch (contextItem.type) {
				case 'shape': {
					const shape = contextItem.shape
					const roundedX = Math.floor(shape.x)
					const roundedY = Math.floor(shape.y)
					this.setRoundingDiff(shape.id, 'x', roundedX - shape.x)
					this.setRoundingDiff(shape.id, 'y', roundedY - shape.y)
					shape.x = roundedX
					shape.y = roundedY
					break
				}
				case 'area': {
					const bounds = contextItem.bounds
					const roundedX = Math.floor(bounds.x)
					const roundedY = Math.floor(bounds.y)
					bounds.x = roundedX
					bounds.y = roundedY
					break
				}
				case 'point': {
					const point = contextItem.point
					const roundedX = Math.floor(point.x)
					const roundedY = Math.floor(point.y)
					point.x = roundedX
					point.y = roundedY
					break
				}
			}
		}

		if (currentUserViewportBounds) {
			const roundedX = Math.floor(currentUserViewportBounds.x)
			const roundedY = Math.floor(currentUserViewportBounds.y)
			const roundedW = Math.floor(currentUserViewportBounds.w)
			const roundedH = Math.floor(currentUserViewportBounds.h)
			currentUserViewportBounds.x = roundedX
			currentUserViewportBounds.y = roundedY
			currentUserViewportBounds.w = roundedW
			currentUserViewportBounds.h = roundedH
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
