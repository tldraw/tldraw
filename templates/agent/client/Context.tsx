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

export function ContextPreview({ context, onRemove }: { context: ContextItem; onRemove(): void }) {
	switch (context.type) {
		case 'shape':
			return <ShapeContextPreview shape={context.shape} onRemove={onRemove} />
	}
}

export function ShapeContextPreview({ shape, onRemove }: { shape: TLShape; onRemove(): void }) {
	let name = shape.type

	if (shape.type === 'geo') {
		name = (shape as TLGeoShape).props.geo
		name = name[0].toUpperCase() + name.slice(1)
	}

	if (shape.meta.note) {
		name = shape.meta.note as string
	}

	return (
		<button type="button" className="chat-input-context-item" onClick={onRemove}>
			<AtIcon /> {name}
		</button>
	)
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
