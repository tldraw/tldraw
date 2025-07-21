import { atom, Box, BoxModel, TLGeoShape, TLShape } from 'tldraw'
import { getSimpleContentFromCanvasContent } from '../worker/simple/getSimpleContentFromCanvasContent'
import { AtIcon } from './icons/AtIcon'

export const $contextItems = atom<ContextItem[]>('context items', [])

export type ContextItem = ShapeContextItem | AreaContextItem

export interface ShapeContextItem {
	type: 'shape'
	shape: TLShape
	id: string
}

export interface AreaContextItem {
	type: 'area'
	bounds: BoxModel
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
	if (a.type === 'shape' && b.type === 'shape') return a.id === b.id
	if (a.type === 'area' && b.type === 'area') return Box.Equals(a.bounds, b.bounds)
	return false
}

export function ContextPreview({
	contextItem,
	onClick,
}: {
	contextItem: ContextItem
	onClick(): void
}) {
	const name = getContextItemName(contextItem)

	return (
		<button type="button" className="context-item-preview" onClick={onClick}>
			<AtIcon /> {name}
		</button>
	)
}

export function getContextItemName(contextItem: ContextItem) {
	switch (contextItem.type) {
		case 'shape': {
			if (contextItem.shape.meta.note) {
				return contextItem.shape.meta.note as string
			}
			const name =
				contextItem.shape.type === 'geo'
					? (contextItem.shape as TLGeoShape).props.geo
					: contextItem.shape.type
			return name[0].toUpperCase() + name.slice(1)
		}
		case 'area': {
			return 'Area'
		}
	}
}

export function getSimpleContextFromContextItems(contextItems: ContextItem[]) {
	const shapeContextItems = contextItems.filter((item) => item.type === 'shape')
	const areaContextItems = contextItems.filter((item) => item.type === 'area')

	const simpleContent = getSimpleContentFromCanvasContent({
		shapes: shapeContextItems.map((item) => item.shape),
		bindings: [],
		assets: [],
	})

	return {
		shapes: simpleContent.shapes,
		areas: areaContextItems.map((area) => roundBox(area.bounds)),
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
