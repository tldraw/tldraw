import { ISimpleShape } from '../../worker/simple/SimpleShape'
import { AgentTransform } from '../AgentTransform'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { ContextItem } from '../types/ContextItem'
import { PromptPartUtil } from './PromptPartUitl'

export class ContextItemsPartUtil extends PromptPartUtil<ContextItem[]> {
	static override type = 'contextItems' as const

	override getPriority() {
		return 60 // context items in middle (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		return options.request.contextItems
	}

	override transformPart(part: ContextItem[], transform: AgentTransform): ContextItem[] {
		return part.map((item) => transformContextItem(item, transform))
	}

	override buildContent(contextItems: ContextItem[]): string[] {
		const messages: string[] = []

		const shapeItems = contextItems.filter((item) => item.type === 'shape')
		const shapesItems = contextItems.filter((item) => item.type === 'shapes')
		const areaItems = contextItems.filter((item) => item.type === 'area')
		const pointItems = contextItems.filter((item) => item.type === 'point')

		// Handle area context items
		if (areaItems.length > 0) {
			const areas = areaItems.map((item) => item.bounds)
			messages.push(
				'The user has specifically brought your attention to the following areas in this request. The user might refer to them as the "area(s)" or perhaps "here" or "there", but either way, it\'s implied that you should focus on these areas in both your reasoning and actions. Make sure to focus your task on these areas:'
			)
			for (const area of areas) {
				messages.push(JSON.stringify(area, null, 2))
			}
		}

		// Handle point context items
		if (pointItems.length > 0) {
			const points = pointItems.map((item) => item.point)
			messages.push(
				'The user has specifically brought your attention to the following points in this request. The user might refer to them as the "point(s)" or perhaps "here" or "there", but either way, it\'s implied that you should focus on these points in both your reasoning and actions. Make sure to focus your task on these points:'
			)
			for (const point of points) {
				messages.push(JSON.stringify(point, null, 2))
			}
		}

		// Handle individual shape context items
		if (shapeItems.length > 0) {
			const shapes = shapeItems.map((item) => item.shape)
			messages.push(
				`The user has specifically brought your attention to these ${shapes.length} shapes individually in this request. Make sure to focus your task on these shapes where applicable:`
			)
			for (const shape of shapes) {
				messages.push(JSON.stringify(shape, null, 2))
			}
		}

		// Handle groups of shapes context items
		for (const contextItem of shapesItems) {
			const shapes = contextItem.shapes
			if (shapes.length > 0) {
				messages.push(
					`The user has specifically brought your attention to the following group of ${shapes.length} shapes in this request. Make sure to focus your task on these shapes where applicable:`
				)
				messages.push(shapes.map((shape) => JSON.stringify(shape, null, 2)).join('\n'))
			}
		}

		return messages
	}
}

/**
 * Transforms context items by sanitizing any shapes within them using the provided AgentTransform.
 * This function handles both individual shape context items and groups of shapes context items.
 *
 * @param contextItems - Array of SimpleContextItem to transform
 * @param transform - AgentTransform instance used for sanitizing shapes
 * @returns Array of transformed SimpleContextItem with sanitized shapes
 */
export function transformContextItem(
	contextItem: ContextItem,
	transform: AgentTransform
): ContextItem {
	switch (contextItem.type) {
		case 'shape': {
			return {
				...contextItem,
				shape: transform.sanitizeExistingShape(contextItem.shape) as ISimpleShape,
			}
		}
		case 'shapes': {
			return {
				...contextItem,
				shapes: contextItem.shapes.map(
					(shape) => transform.sanitizeExistingShape(shape) as ISimpleShape
				),
			}
		}
		case 'area': {
			return {
				...contextItem,
				bounds: transform.roundBoxModel(contextItem.bounds),
			}
		}
		case 'point': {
			return {
				...contextItem,
				point: transform.roundVecModel(contextItem.point),
			}
		}
		default: {
			return contextItem
		}
	}
}
