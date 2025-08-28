import { Editor } from 'tldraw'
import { AgentTransform, roundBox, roundVec } from '../AgentTransform'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { IContextItem } from '../types/ContextItem'
import { PromptPartUtil } from './PromptPartUtil'

export interface ContextItemsPart extends BasePromptPart<'contextItems'> {
	items: IContextItem[]
	requestType: AgentRequest['type']
}

export class ContextItemsPartUtil extends PromptPartUtil<ContextItemsPart> {
	static override type = 'contextItems' as const

	override getPriority() {
		return 60 // context items in middle (low priority)
	}

	override getPart(_editor: Editor, request: AgentRequest): ContextItemsPart {
		return {
			type: 'contextItems',
			items: request.contextItems,
			requestType: request.type,
		}
	}

	override transformPart(part: ContextItemsPart, transform: AgentTransform): ContextItemsPart {
		const items = part.items.map((contextItem) => {
			switch (contextItem.type) {
				case 'shape': {
					return {
						...contextItem,
						shape: transform.roundShape(contextItem.shape),
					}
				}
				case 'shapes': {
					return {
						...contextItem,
						shapes: contextItem.shapes.map((shape) => transform.roundShape(shape)),
					}
				}
				case 'area': {
					return {
						...contextItem,
						bounds: roundBox(contextItem.bounds),
					}
				}
				case 'point': {
					return {
						...contextItem,
						point: roundVec(contextItem.point),
					}
				}
				default: {
					return contextItem
				}
			}
		})

		return { ...part, items }
	}

	override buildContent({ items, requestType }: ContextItemsPart): string[] {
		const messages: string[] = []

		const shapeItems = items.filter((item) => item.type === 'shape')
		const shapesItems = items.filter((item) => item.type === 'shapes')
		const areaItems = items.filter((item) => item.type === 'area')
		const pointItems = items.filter((item) => item.type === 'point')

		// Handle area context items
		if (areaItems.length > 0) {
			const isReview = requestType === 'review'
			const areas = areaItems.map((item) => item.bounds)
			messages.push(
				isReview
					? 'You are currently reviewing your work, and you have decided to focus your view on the following area. Make sure to focus your task here.'
					: 'The user has specifically brought your attention to the following areas in this request. The user might refer to them as the "area(s)" or perhaps "here" or "there", but either way, it\'s implied that you should focus on these areas in both your reasoning and actions. Make sure to focus your task on these areas:'
			)
			for (const area of areas) {
				messages.push(JSON.stringify(area))
			}
		}

		// Handle point context items
		if (pointItems.length > 0) {
			const points = pointItems.map((item) => item.point)
			messages.push(
				'The user has specifically brought your attention to the following points in this request. The user might refer to them as the "point(s)" or perhaps "here" or "there", but either way, it\'s implied that you should focus on these points in both your reasoning and actions. Make sure to focus your task on these points:'
			)
			for (const point of points) {
				messages.push(JSON.stringify(point))
			}
		}

		// Handle individual shape context items
		if (shapeItems.length > 0) {
			const shapes = shapeItems.map((item) => item.shape)
			messages.push(
				`The user has specifically brought your attention to these ${shapes.length} shapes individually in this request. Make sure to focus your task on these shapes where applicable:`
			)
			for (const shape of shapes) {
				messages.push(JSON.stringify(shape))
			}
		}

		// Handle groups of shapes context items
		for (const contextItem of shapesItems) {
			const shapes = contextItem.shapes
			if (shapes.length > 0) {
				messages.push(
					`The user has specifically brought your attention to the following group of ${shapes.length} shapes in this request. Make sure to focus your task on these shapes where applicable:`
				)
				messages.push(shapes.map((shape) => JSON.stringify(shape)).join('\n'))
			}
		}

		return messages
	}
}
