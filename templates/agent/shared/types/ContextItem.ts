import { BoxModel, VecModel } from 'tldraw'
import { AgentIconType } from '../../client/components/icons/AgentIcon'
import { ISimpleShape } from '../../worker/simple/SimpleShape'

export type ContextItem = ShapeContextItem | AreaContextItem | PointContextItem | ShapesContextItem

export interface ShapeContextItem {
	type: 'shape'
	shape: ISimpleShape
	source: 'agent' | 'user'
}

export interface ShapesContextItem {
	type: 'shapes'
	shapes: ISimpleShape[]
	source: 'agent' | 'user'
}

export interface AreaContextItem {
	type: 'area'
	bounds: BoxModel
	source: 'agent' | 'user'
}

export interface PointContextItem {
	type: 'point'
	point: VecModel
	source: 'agent' | 'user'
}

export interface ContextItemDefinition {
	name(item: ContextItem): string
	icon: AgentIconType
}

export const CONTEXT_TYPE_DEFINITIONS: Record<ContextItem['type'], ContextItemDefinition> = {
	shape: {
		name: (item: ShapeContextItem) => {
			if (item.shape.note) {
				return item.shape.note
			}
			const name = item.shape._type
			return name[0].toUpperCase() + name.slice(1)
		},
		icon: 'target',
	},
	area: {
		name: () => 'Area',
		icon: 'target',
	},
	point: {
		name: () => 'Point',
		icon: 'target',
	},
	shapes: {
		name: (item: ShapesContextItem) => {
			return item.shapes.length + ' shapes'
		},
		icon: 'target',
	},
}
