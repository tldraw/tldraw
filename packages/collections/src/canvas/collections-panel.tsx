import { useCallback, useEffect, useRef } from 'react'
import {
	defineMessages,
	EditorPortal,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionItemId } from '../lib/schema'
import { CollectionSection } from './collection-section'
import { CollectionsPanelHeader } from './collections-panel-header'
import { placeCollectionItem } from './place-item'
import { activeCollectionId, collapsedCollectionIds, collectionsPanelOpen } from './state'
import { useItemDrag } from './use-item-drag'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
	empty: { id: 'collections.empty', defaultMessage: 'No collections yet.' },
	placeErrorTitle: { id: 'collections.place-error.title', defaultMessage: "Couldn't place item" },
	placeErrorDescription: {
		id: 'collections.place-error.description',
		defaultMessage: 'It may have been deleted. Try again, or pick another item.',
	},
})

/** @public */
export interface CollectionsPanelProps {
	source: CollectionSource
	/** Which side of the canvas the panel floats on. Defaults to `'left'`. */
	side?: 'left' | 'right'
	/**
	 * How many rows of items each collection shows before a "Show all" control reveals the rest.
	 * Defaults to 2. Pass `Infinity` to show every item.
	 */
	sectionRows?: number
}

/**
 * A floating panel on one side of the canvas for browsing a {@link CollectionSource}, shown while
 * {@link collectionsPanelOpen} is set. Every collection is a section of one scroll, under a header
 * that folds it shut. Clicking an item places a copy of it in the middle of the viewport; dragging
 * one out drops it under the pointer.
 * @public @react
 */
export function CollectionsPanel({
	source,
	side = 'left',
	sectionRows = 2,
}: CollectionsPanelProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const sectionsRef = useRef<HTMLDivElement>(null)
	const open = useValue('collections panel open', () => collectionsPanelOpen.get(editor), [editor])
	const collections = useValue('collections', () => source.getCollections(), [source])
	const activeId = useValue('active collection', () => activeCollectionId.get(editor), [editor])
	const placeItem = useCallback(
		(itemId: TLCollectionItemId) => {
			placeCollectionItem(editor, source, itemId).catch(() => {
				addToast({
					title: msg(messages.placeErrorTitle),
					description: msg(messages.placeErrorDescription),
					severity: 'error',
				})
			})
		},
		[editor, source, addToast, msg]
	)
	const getItemProps = useItemDrag(source, placeItem)

	// Brings the active collection into view once its section is on screen, then lets it go so the
	// same collection can be shown again.
	useEffect(() => {
		if (!open || !activeId || !collections.some((c) => c.id === activeId)) return
		collapsedCollectionIds.update(editor, (ids) => ids.filter((id) => id !== activeId))
		const section = Array.from(
			sectionsRef.current?.querySelectorAll<HTMLElement>('[data-collection-id]') ?? []
		).find((element) => element.dataset.collectionId === activeId)
		section?.scrollIntoView({ block: 'nearest' })
		activeCollectionId.set(editor, null)
	}, [editor, open, activeId, collections])

	if (!open) return null

	return (
		<EditorPortal>
			<section
				className="tlui-collections-panel"
				data-side={side}
				aria-label={msg(messages.title)}
				onContextMenu={(e) => e.stopPropagation()}
			>
				<CollectionsPanelHeader source={source} collections={collections} />
				{collections.length === 0 ? (
					<p className="tlui-collections-panel__empty">{msg(messages.empty)}</p>
				) : (
					<div ref={sectionsRef} className="tlui-collections-sections">
						{collections.map((collection) => (
							<CollectionSection
								key={collection.id}
								source={source}
								collection={collection}
								getItemProps={getItemProps}
								rows={sectionRows}
							/>
						))}
					</div>
				)}
			</section>
		</EditorPortal>
	)
}
