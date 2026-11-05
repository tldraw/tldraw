import { type ButtonHTMLAttributes, useEffect, useRef } from 'react'
import { useEditor, useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { PackCatalogue } from '../lib/PackCatalogue'
import type { TLCollection, TLCollectionItemId } from '../lib/schema'
import { CollectionItems } from './collection-items'
import { CollectionSectionHeader } from './collection-section-header'
import { defaultItemOrderings, getItemOrderChoice, setItemOrderChoice } from './item-order'
import { activeCollectionId, collapsedCollectionIds } from './state'

/**
 * One collection in the panel: its header, then its items, which fold away. Scrolls into view, and
 * unfolds, when it becomes the active collection, e.g. from a toast's "Open".
 */
export function CollectionSection({
	source,
	collection,
	getItemProps,
	catalogue,
}: {
	source: CollectionSource
	collection: TLCollection
	getItemProps(itemId: TLCollectionItemId): ButtonHTMLAttributes<HTMLButtonElement>
	catalogue?: PackCatalogue
}) {
	const editor = useEditor()
	const ref = useRef<HTMLElement>(null)
	const collectionId = collection.id
	const collapsed = useValue(
		'collection collapsed',
		() => collapsedCollectionIds.get(editor).includes(collectionId),
		[editor, collectionId]
	)
	const setCollapsed = (shut: boolean) =>
		collapsedCollectionIds.update(editor, (ids) => {
			const rest = ids.filter((id) => id !== collectionId)
			return shut ? [...rest, collectionId] : rest
		})
	const isActive = useValue(
		'collection active',
		() => activeCollectionId.get(editor) === collectionId,
		[editor, collectionId]
	)
	useEffect(() => {
		if (!isActive) return
		collapsedCollectionIds.update(editor, (ids) => ids.filter((id) => id !== collectionId))
		ref.current?.scrollIntoView({ block: 'nearest' })
		activeCollectionId.set(editor, null)
	}, [editor, isActive, collectionId])

	const choice = useValue('item order', () => getItemOrderChoice(source.id, collectionId), [
		source,
		collectionId,
	])
	// A stored choice no longer offered falls back to the first ordering.
	const ordering =
		defaultItemOrderings.find((o) => o.id === choice.orderingId) ?? defaultItemOrderings[0]

	return (
		<section ref={ref} className="tlui-collections-section">
			<CollectionSectionHeader
				source={source}
				collection={collection}
				collapsed={collapsed}
				onToggleCollapsed={() => setCollapsed(!collapsed)}
				catalogue={catalogue}
				sort={{
					options: defaultItemOrderings.map(({ id, label }) => ({ id, label })),
					value: ordering.id,
					onValueChange: (orderingId) =>
						setItemOrderChoice(source.id, collectionId, { ...choice, orderingId }),
					reversed: choice.reversed,
					onReversedChange: (reversed) =>
						setItemOrderChoice(source.id, collectionId, { ...choice, reversed }),
				}}
			/>
			{!collapsed && (
				<CollectionItems
					source={source}
					collectionId={collectionId}
					getItemProps={getItemProps}
					ordering={ordering}
					reversed={choice.reversed}
				/>
			)}
		</section>
	)
}
