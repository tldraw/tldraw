import { type ButtonHTMLAttributes, useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollection, TLCollectionItemId } from '../lib/schema'
import { CollectionItems } from './collection-items'
import { CollectionSectionHeader } from './collection-section-header'
import { getItemOrderChoice, itemOrderings, setItemOrderChoice } from './item-order'
import type { PrepareItemContent } from './save-shapes'
import { activeCollectionId, collapsedCollectionIds } from './state'

/** Unfolds and scrolls into view when it becomes the active collection, e.g. from a toast's "Open". */
export function CollectionSection({
	source,
	collection,
	getItemProps,
	prepareItemContent,
}: {
	source: CollectionSource
	collection: TLCollection
	getItemProps(itemId: TLCollectionItemId): ButtonHTMLAttributes<HTMLButtonElement>
	prepareItemContent?: PrepareItemContent
}) {
	const editor = useEditor()
	const ref = useRef<HTMLElement | null>(null)
	// Also in state, so the tiles can measure once it mounts. The ref stays for the scroll below,
	// which runs before a state update would land.
	const [element, setElement] = useState<HTMLElement | null>(null)
	const setRef = useCallback((el: HTMLElement | null) => {
		ref.current = el
		setElement(el)
	}, [])
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
		if (ref.current) ref.current.scrollIntoView({ block: 'nearest' })
		activeCollectionId.set(editor, null)
	}, [editor, isActive, collectionId])

	const choice = useValue('item order', () => getItemOrderChoice(source.id, collectionId), [
		source,
		collectionId,
	])
	const ordering = itemOrderings.find((o) => o.id === choice.orderingId) ?? itemOrderings[0]

	return (
		<section ref={setRef} className="tlui-collections-section">
			<CollectionSectionHeader
				source={source}
				collection={collection}
				collapsed={collapsed}
				onToggleCollapsed={() => setCollapsed(!collapsed)}
				sort={{
					options: itemOrderings.map(({ id, label }) => ({ id, label })),
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
					container={element}
					getItemProps={getItemProps}
					ordering={ordering}
					reversed={choice.reversed}
					prepareItemContent={prepareItemContent}
				/>
			)}
		</section>
	)
}
