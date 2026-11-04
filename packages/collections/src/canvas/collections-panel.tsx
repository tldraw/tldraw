import { useCallback } from 'react'
import {
	defineMessages,
	EditorPortal,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollection, TLCollectionItemId } from '../lib/schema'
import { CollectionList } from '../ui/collection-list'
import { CollectionItems } from './collection-items'
import { CollectionsPanelHeader } from './collections-panel-header'
import { placeCollectionItem } from './place-item'
import { activeCollectionId, collapsedCollectionIds, collectionsPanelOpen } from './state'
import { useItemDrag } from './use-item-drag'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
	empty: { id: 'collections.empty', defaultMessage: 'No collections yet.' },
	itemCount: {
		id: 'collections.item-count',
		defaultMessage: '{count, plural, one {# item} other {# items}}',
	},
	placeErrorTitle: { id: 'collections.place-error.title', defaultMessage: "Couldn't place item" },
	placeErrorDescription: {
		id: 'collections.place-error.description',
		defaultMessage: 'It may have been deleted. Try again, or pick another item.',
	},
})

/**
 * How the panel moves between collections:
 * - `'picker'`: a picker in the header over the open collection's items.
 * - `'list'`: a list of collections with their item counts, each opening into its items.
 * - `'sections'`: every collection in one scroll, each a section that folds shut.
 * @public
 */
export type CollectionsPanelNavigation = 'picker' | 'list' | 'sections'

/** @public */
export interface CollectionsPanelProps {
	source: CollectionSource
	/** Defaults to `'picker'`. */
	navigation?: CollectionsPanelNavigation
}

/**
 * A floating panel on the left of the canvas for browsing a {@link CollectionSource}, shown while
 * {@link collectionsPanelOpen} is set. Clicking an item places a copy of it in the middle of the
 * viewport; dragging one out drops it under the pointer.
 * @public @react
 */
export function CollectionsPanel({ source, navigation = 'picker' }: CollectionsPanelProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const open = useValue('collections panel open', () => collectionsPanelOpen.get(editor), [editor])
	const collections = useValue('collections', () => source.getCollections(), [source])
	const activeId = useValue('active collection', () => activeCollectionId.get(editor), [editor])
	// With a picker, a stale id (the collection was deleted) falls back to the first collection
	// rather than an empty panel. With the list, no open collection shows the list.
	const current =
		collections.find((collection) => collection.id === activeId) ??
		(navigation === 'picker' ? collections[0] : undefined)
	const itemCounts = useValue(
		'collection item counts',
		() => new Map(collections.map((c) => [c.id, source.getItems(c.id).length])),
		[source, collections]
	)
	const collapsed = useValue('collapsed collections', () => collapsedCollectionIds.get(editor), [
		editor,
	])
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
	const countOf = (collection: TLCollection) => itemCounts.get(collection.id) ?? 0

	if (!open) return null

	const body = () => {
		if (navigation === 'sections') {
			if (collections.length === 0) {
				return <p className="tlui-collections-panel__empty">{msg(messages.empty)}</p>
			}
			return (
				<div className="tlui-collections-sections">
					{collections.map((collection) => {
						const isCollapsed = collapsed.includes(collection.id)
						return (
							<section key={collection.id} className="tlui-collections-section">
								<CollectionsPanelHeader
									source={source}
									collections={collections}
									current={collection}
									itemCount={countOf(collection)}
									detail={String(countOf(collection))}
									collapsed={isCollapsed}
									onToggleCollapsed={() =>
										collapsedCollectionIds.update(editor, (ids) =>
											isCollapsed
												? ids.filter((id) => id !== collection.id)
												: [...ids, collection.id]
										)
									}
								/>
								{!isCollapsed && (
									<CollectionItems
										source={source}
										collectionId={collection.id}
										getItemProps={getItemProps}
									/>
								)}
							</section>
						)
					})}
				</div>
			)
		}
		if (current) {
			return (
				<CollectionItems source={source} collectionId={current.id} getItemProps={getItemProps} />
			)
		}
		if (navigation === 'list') {
			return (
				<CollectionList
					collections={collections.map((collection) => ({
						id: collection.id,
						name: collection.name,
						detail: msg(messages.itemCount, { count: countOf(collection) }),
					}))}
					onOpen={(id) => activeCollectionId.set(editor, id)}
					empty={msg(messages.empty)}
				/>
			)
		}
		return <p className="tlui-collections-panel__empty">{msg(messages.empty)}</p>
	}

	return (
		<EditorPortal>
			<section
				className="tlui-collections-panel"
				aria-label={msg(messages.title)}
				onContextMenu={(e) => e.stopPropagation()}
			>
				<CollectionsPanelHeader
					source={source}
					collections={collections}
					current={navigation === 'sections' ? undefined : current}
					itemCount={current ? countOf(current) : 0}
					onBack={navigation === 'list' ? () => activeCollectionId.set(editor, null) : undefined}
				/>
				{body()}
			</section>
		</EditorPortal>
	)
}
