import { ISimpleShape } from '../../worker/simple/SimpleShape'
import { convertShapeToSimpleShape } from '../ai/promptConstruction/translateFromDrawishToSimplish'
import { AgentIconType } from '../components/icons/AgentIcon'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'
import {
	AreaContextItem,
	ContextItem,
	PointContextItem,
	ShapeContextItem,
	ShapesContextItem,
} from '../types/ContextItem'
import { PromptPartUtil } from './PromptPartUitl'

export class ContextItemsPartUtil extends PromptPartUtil {
	static override type = 'contextItems' as const

	static override getPriority(_prompt: AgentPrompt): number {
		return 60 // context items in middle (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const contextItems = options.request?.contextItems
		if (!contextItems) return undefined

		const processedContextItems = contextItems
			.map((item) => processContextItem(item, options.editor))
			.filter((item): item is SimpleContextItem => item !== null)

		return processedContextItems
	}

	static override buildContent(_prompt: AgentPrompt, contextItems: SimpleContextItem[]): string[] {
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

export type SimpleContextItem =
	| SimpleShapeContextItem
	| SimpleShapesContextItem
	| SimpleAreaContextItem
	| SimplePointContextItem

export type SimpleShapeContextItem = Omit<ShapeContextItem, 'shape'> & {
	shape: ISimpleShape
}

export type SimpleShapesContextItem = Omit<ShapesContextItem, 'shapes'> & {
	shapes: ISimpleShape[]
}

export type SimpleAreaContextItem = AreaContextItem
export type SimplePointContextItem = PointContextItem

export interface SimpleContextItemDefinition {
	name(item: SimpleContextItem): string
	icon: AgentIconType
}

export function processContextItem(item: ContextItem, editor: any): SimpleContextItem | null {
	switch (item.type) {
		case 'shape':
			return processShapeContextItem(item, editor)
		case 'shapes':
			return processShapesContextItem(item, editor)
		case 'area':
			return processAreaContextItem(item)
		case 'point':
			return processPointContextItem(item)
		default:
			console.warn('Unknown context item type:', item)
			return null
	}
}

export function processShapeContextItem(
	item: ContextItem,
	editor: any
): SimpleShapeContextItem | null {
	if (item.type !== 'shape') return null

	const simpleShape = convertShapeToSimpleShape(item.shape, editor)
	if (!simpleShape) return null

	return {
		type: 'shape',
		shape: simpleShape,
		source: item.source,
	}
}

export function processShapesContextItem(
	item: ContextItem,
	editor: any
): SimpleShapesContextItem | null {
	if (item.type !== 'shapes') return null

	const simpleShapes = item.shapes
		.map((shape: any) => convertShapeToSimpleShape(shape, editor))
		.filter((shape): shape is NonNullable<typeof shape> => shape !== null)

	if (simpleShapes.length === 0) return null

	return {
		type: 'shapes',
		shapes: simpleShapes,
		source: item.source,
	}
}

export function processAreaContextItem(item: ContextItem): SimpleAreaContextItem {
	if (item.type !== 'area') throw new Error('Expected area context item')

	const { bounds } = item
	return {
		type: 'area',
		bounds: {
			x: bounds.x,
			y: bounds.y,
			w: bounds.w,
			h: bounds.h,
		},
		source: item.source,
	}
}

export function processPointContextItem(item: ContextItem): SimplePointContextItem {
	if (item.type !== 'point') throw new Error('Expected point context item')

	const { point } = item
	return {
		type: 'point',
		point: {
			x: point.x,
			y: point.y,
		},
		source: item.source,
	}
}
