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
import type { TLCollectionItemId } from '../lib/schema'
import { CollectionGroupSection } from './collection-group-section'
import { groupCollectionList, useCollectionGrouping } from './collection-groups'
import { CollectionSection } from './collection-section'
import { CollectionsPanelHeader } from './collections-panel-header'
import { NoCollections } from './no-collections'
import { placeCollectionItem } from './place-item'
import { collectionsPanelOpen } from './state'
import { useItemDrag } from './use-item-drag'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
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
}

/**
 * A floating panel on one side of the canvas for browsing a {@link CollectionSource}, shown while
 * {@link collectionsPanelOpen} is set. Each collection is a section that folds shut; a source with
 * two or more owners groups them under each owner's name. Clicking an item places a copy of it in
 * the middle of the viewport; dragging one out drops it under the pointer.
 * @public @react
 */
export function CollectionsPanel({ source, side = 'left' }: CollectionsPanelProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const open = useValue('collections panel open', () => collectionsPanelOpen.get(editor), [editor])
	const collections = useValue('collections', () => source.getCollections(), [source])
	const grouping = useCollectionGrouping(source)
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

	if (!open) return null

	return (
		<EditorPortal>
			<section
				className="tlui-collections-panel"
				data-side={side}
				aria-label={msg(messages.title)}
				onContextMenu={(e) => e.stopPropagation()}
			>
				<CollectionsPanelHeader source={source} />
				{collections.length === 0 ? (
					<NoCollections />
				) : (
					<div className="tlui-collections-sections">
						{groupCollectionList(collections, grouping).map((group) => (
							<CollectionGroupSection key={group.key ?? ''} source={source} group={group}>
								{group.collections.map((collection) => (
									<CollectionSection
										key={collection.id}
										source={source}
										collection={collection}
										getItemProps={getItemProps}
									/>
								))}
							</CollectionGroupSection>
						))}
					</div>
				)}
			</section>
		</EditorPortal>
	)
}
