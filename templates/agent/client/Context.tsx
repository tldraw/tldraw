import { atom, Box, BoxModel, TLGeoShape, TLPage, TLShape, Vec, VecModel } from 'tldraw'
import { getSimpleContentFromCanvasContent } from '../worker/simple/getSimpleContentFromCanvasContent'
import { TargetIcon } from './icons/TargetIcon'

export const $contextItems = atom<ContextItem[]>('context items', [])
export const $pendingContextItems = atom<ContextItem[]>('pending context items', [])

export type ContextItem =
	| ShapeContextItem
	| AreaContextItem
	| PointContextItem
	| ViewportContextItem
	| PageContextItem
	| SelectionContextItem

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
	viewport: {
		name: () => 'Viewport',
		icon: () => <TargetIcon />,
	},
	page: {
		name: () => 'Page',
		icon: () => <TargetIcon />,
	},
	selection: {
		name: () => 'Selection',
		icon: () => <TargetIcon />,
	},
}

export interface ShapeContextItem {
	type: 'shape'
	shape: TLShape
}

export interface ShapesContextItem {
	type: 'shapes'
	shapes: TLShape[]
}

export interface AreaContextItem {
	type: 'area'
	bounds: BoxModel
}

export interface PointContextItem {
	type: 'point'
	point: VecModel
}

export interface ViewportContextItem {
	type: 'viewport'
	bounds: BoxModel
}

export interface PageContextItem {
	type: 'page'
	page: TLPage
}

export interface SelectionContextItem {
	type: 'selection'
	shapes: TLShape[]
}

export function addToContext(item: ContextItem) {
	$contextItems.update((items) => {
		const existingItem = items.find((v) => areContextItemsEquivalent(v, item))
		if (existingItem) return items
		return [...items, item]
	})
}

export function removeFromContext(item: ContextItem) {
	$contextItems.update((items) => items.filter((v) => !areContextItemsEquivalent(v, item)))
}

export function areContextItemsEquivalent(a: ContextItem, b: ContextItem) {
	if (a.type !== b.type) return false
	if (a.type === 'shape' && b.type === 'shape') return a.shape.id === b.shape.id
	if (a.type === 'area' && b.type === 'area') return Box.Equals(a.bounds, b.bounds)
	if (a.type === 'point' && b.type === 'point') return Vec.Equals(a.point, b.point)
	if (a.type === 'viewport' && b.type === 'viewport') return Box.Equals(a.bounds, b.bounds)
	if (a.type === 'page' && b.type === 'page') return a.page.id === b.page.id
	if (a.type === 'selection' && b.type === 'selection') {
		return a.shapes.every((shape) => b.shapes.findIndex((s) => s.id === shape.id) !== -1)
	}

	throw new Error('Unknown context item type')
}

export function ContextPreview({
	contextItem,
	onClick,
}: {
	contextItem: ContextItem
	onClick(): void
}) {
	const definition = CONTEXT_TYPE_DEFINITIONS[contextItem.type]
	const name = definition.name(contextItem)
	const icon = definition.icon(contextItem)
	return (
		<button type="button" className="context-item-preview" onClick={onClick}>
			{icon} {name}
		</button>
	)
}

export function getSimpleContextFromContextItems(contextItems: ContextItem[]) {
	const shapeContextItems = contextItems.filter((item) => item.type === 'shape')
	const areaContextItems = contextItems.filter((item) => item.type === 'area')
	const pointContextItems = contextItems.filter((item) => item.type === 'point')

	const simpleContent = getSimpleContentFromCanvasContent({
		shapes: shapeContextItems.map((item) => item.shape),
		bindings: [],
		assets: [],
	})

	return {
		shapes: simpleContent.shapes,
		areas: areaContextItems.map((area) => roundBox(area.bounds)),
		points: pointContextItems.map((point) => point.point),
	}
}

export function roundBox(box: BoxModel) {
	const b = { ...box }
	b.x = Math.round(b.x)
	b.y = Math.round(b.y)
	b.w = Math.round(b.w)
	b.h = Math.round(b.h)
	return b
}
