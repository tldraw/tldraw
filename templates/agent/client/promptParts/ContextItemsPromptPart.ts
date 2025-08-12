import { ISimpleShape } from '../../worker/simple/SimpleShape'
import { convertShapeToSimpleShape } from '../ai/promptConstruction/translateFromDrawishToModelish'
import { AgentIconType } from '../components/icons/AgentIcon'
import {
	AreaContextItem,
	ContextItem,
	PointContextItem,
	ShapeContextItem,
	ShapesContextItem,
} from '../types/ContextItem'
import { TLAgentPrompt, TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartHandler } from './PromptPartHandler'

export class ContextItemsPromptPart extends PromptPartHandler {
	static override type = 'contextItems' as const

	override async getPromptPart(options: TLAgentPromptOptions): Promise<Partial<TLAgentPrompt>> {
		const { contextItems } = options
		if (!contextItems || contextItems.length === 0) {
			return { contextItems: [] }
		}

		const processedContextItems = contextItems
			.map((item) => this.processContextItem(item, options.editor))
			.filter((item): item is SimpleContextItem => item !== null)

		return { contextItems: processedContextItems }
	}

	private processContextItem(item: ContextItem, editor: any): SimpleContextItem | null {
		switch (item.type) {
			case 'shape':
				return this.processShapeContextItem(item, editor)
			case 'shapes':
				return this.processShapesContextItem(item, editor)
			case 'area':
				return this.processAreaContextItem(item)
			case 'point':
				return this.processPointContextItem(item)
			default:
				console.warn('Unknown context item type:', item)
				return null
		}
	}

	private processShapeContextItem(item: ContextItem, editor: any): SimpleShapeContextItem | null {
		if (item.type !== 'shape') return null

		const simpleShape = convertShapeToSimpleShape(item.shape, editor)
		if (!simpleShape) return null

		return {
			type: 'shape',
			shape: simpleShape,
			source: item.source,
		}
	}

	private processShapesContextItem(item: ContextItem, editor: any): SimpleShapesContextItem | null {
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

	private processAreaContextItem(item: ContextItem): SimpleAreaContextItem {
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

	private processPointContextItem(item: ContextItem): SimplePointContextItem {
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
