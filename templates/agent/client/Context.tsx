import { atom, TLGeoShape, TLShape } from 'tldraw'
import { getSimpleContentFromCanvasContent } from '../worker/simple/getSimpleContentFromCanvasContent'
import { AtIcon } from './icons/AtIcon'

export interface ShapeContextItem {
	type: 'shape'
	shape: TLShape
	id: string
}

export type ContextItem = ShapeContextItem

export const $contextItems = atom<ContextItem[]>('context items', [])

export function addToContext(item: ContextItem) {
	$contextItems.update((items) => [...items, item])
}

export function removeFromContext(item: ContextItem) {
	$contextItems.update((items) => items.filter((v) => v !== item))
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
	}
}

export function getSimpleContentFromContextItems(contextItems: ContextItem[]) {
	const shapeContextItems = contextItems.filter((item) => item.type === 'shape')

	const simpleContent = getSimpleContentFromCanvasContent({
		shapes: shapeContextItems.map((item) => item.shape),
		bindings: [],
		assets: [],
	})

	return simpleContent
}
