import { BoxModel, Editor, VecModel } from 'tldraw'
import { AgentIconType } from '../../client/components/icons/AgentIcon'
import { ISimpleShape } from '../format/SimpleShape'

export type IContextItem =
	| IShapeContextItem
	| IAreaContextItem
	| IPointContextItem
	| IShapesContextItem

export interface IShapeContextItem {
	type: 'shape'
	shape: ISimpleShape
	source: 'agent' | 'user'
}

export interface IShapesContextItem {
	type: 'shapes'
	shapes: ISimpleShape[]
	source: 'agent' | 'user'
}

export interface IAreaContextItem {
	type: 'area'
	bounds: BoxModel
	source: 'agent' | 'user'
}

export interface IPointContextItem {
	type: 'point'
	point: VecModel
	source: 'agent' | 'user'
}

export const CONTEXT_TYPE_DEFINITIONS: Record<
	IContextItem['type'],
	{
		icon: AgentIconType
		name(item: IContextItem, editor: Editor): string
	}
> = {
	shape: {
		icon: 'target',
		name: (item: IShapeContextItem) => {
			let name = item.shape.note
			if (!name) {
				name = item.shape._type
				if (item.shape._type === 'draw') {
					name = 'drawing'
				} else if (item.shape._type === 'unknown') {
					name = item.shape.subType
				}
			}

			return name[0].toUpperCase() + name.slice(1)
		},
	},
	area: {
		icon: 'target',
		name: () => 'Area',
	},
	point: {
		icon: 'target',
		name: () => 'Point',
	},
	shapes: {
		icon: 'target',
		name: (item: IShapesContextItem, editor: Editor) => {
			const count = item.shapes.length
			if (count === 1) return CONTEXT_TYPE_DEFINITIONS['shape'].name(item, editor)
			return `${count} shapes`
		},
	},
}
