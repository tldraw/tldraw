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
import {
	defaultItemOrderings,
	getItemOrderChoice,
	setItemOrderChoice,
	type TLCollectionItemOrdering,
} from './item-order'
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
	/**
	 * The ways users can order a collection's items, offered in the panel's ⋯ menu; the first is
	 * the default. Defaults to the source's order, newest first, and by name. With only one, the
	 * menu has no "Sort items by". Each user's choice is kept in their browser.
	 */
	itemOrderings?: TLCollectionItemOrdering[]
	/** Which side of the canvas the panel floats on. Defaults to `'left'`. */
	side?: 'left' | 'right'
}

/**
 * A floating panel on one side of the canvas for browsing a {@link CollectionSource}, shown while
 * {@link collectionsPanelOpen} is set. Clicking an item places a copy of it in the middle of the
 * viewport; dragging one out drops it under the pointer.
 * @public @react
 */
export function CollectionsPanel({
	source,
	navigation = 'picker',
	itemOrderings = defaultItemOrderings,
	side = 'left',
}: CollectionsPanelProps) {
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
	const orderChoice = useValue('item order', () => getItemOrderChoice(source.id), [source])
	// A stored choice the host no longer offers falls back to its first ordering.
	const ordering = itemOrderings.find((o) => o.id === orderChoice.orderingId) ?? itemOrderings[0]
	const sort =
		itemOrderings.length > 1
			? {
					options: itemOrderings.map(({ id, label }) => ({ id, label })),
					value: ordering.id,
					onValueChange: (orderingId: string) =>
						setItemOrderChoice(source.id, { ...orderChoice, orderingId }),
					reversed: orderChoice.reversed,
					onReversedChange: (reversed: boolean) =>
						setItemOrderChoice(source.id, { ...orderChoice, reversed }),
				}
			: undefined
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
										ordering={ordering}
										reversed={orderChoice.reversed}
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
				<CollectionItems
					source={source}
					collectionId={current.id}
					getItemProps={getItemProps}
					ordering={ordering}
					reversed={orderChoice.reversed}
				/>
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
				data-side={side}
				aria-label={msg(messages.title)}
				onContextMenu={(e) => e.stopPropagation()}
			>
				<CollectionsPanelHeader
					source={source}
					collections={collections}
					current={navigation === 'sections' ? undefined : current}
					itemCount={current ? countOf(current) : 0}
					sort={sort}
					onBack={navigation === 'list' ? () => activeCollectionId.set(editor, null) : undefined}
				/>
				{body()}
			</section>
		</EditorPortal>
	)
}
