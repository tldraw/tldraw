import { BoxModel, TLGeoShape, TLShape, VecModel } from 'tldraw'
import { TargetIcon } from '../icons/TargetIcon'

export type ContextItem = ShapeContextItem | AreaContextItem | PointContextItem | ShapesContextItem

export const CONTEXT_TYPE_DEFINITIONS: Record<
	ContextItem['type'],
	{ name(item: ContextItem): string; icon(item: ContextItem): React.ReactNode }
> = {
	shape: {
		name: (item: ShapeContextItem) => {
			if (item.shape.meta.note) {
				return item.shape.meta.note as string
			}
			const name =
				item.shape.type === 'geo' ? (item.shape as TLGeoShape).props.geo : item.shape.type
			return name[0].toUpperCase() + name.slice(1)
		},
		icon: () => <TargetIcon />,
	},
	area: {
		name: () => 'Area',
		icon: () => <TargetIcon />,
	},
	point: {
		name: () => 'Point',
		icon: () => <TargetIcon />,
	},
	shapes: {
		name: (item: ShapesContextItem) => {
			return item.shapes.length + ' shapes'
		},
		icon: () => <TargetIcon />,
	},
}

export interface ShapeContextItem {
	type: 'shape'
	shape: TLShape
	source: 'agent' | 'user'
}

export interface ShapesContextItem {
	type: 'shapes'
	shapes: TLShape[]
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
