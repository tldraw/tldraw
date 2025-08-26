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
			if (item.shape.note) {
				return item.shape.note
			}
			const name = item.shape._type
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
		name: (item: IShapesContextItem) => {
			const count = item.shapes.length
			return count === 1 ? '1 shape' : `${count} shapes`
		},
	},
}
