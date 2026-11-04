import type { ButtonHTMLAttributes } from 'react'
import { defineMessages, TldrawUiIcon, useEditor, useTranslation, useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import { getThumbnailForColorMode, type TLCollection, type TLCollectionItemId } from '../lib/schema'
import { sortItems, type TLCollectionItemOrdering } from './item-order'

const messages = defineMessages({
	itemCount: {
		id: 'collections.item-count',
		defaultMessage: '{count, plural, one {# item} other {# items}}',
	},
	unnamedItem: { id: 'collections.unnamed-item', defaultMessage: 'Unnamed item' },
	showAll: {
		id: 'collections.preview.show-all',
		defaultMessage: 'Show all {count} items in {name}',
	},
	empty: { id: 'collections.empty-collection', defaultMessage: 'Nothing saved here yet.' },
})

/** How many tiles a row has room for; past that, the last slot shows how many more there are. */
const SLOTS = 4

export interface CollectionPreviewRowProps {
	source: CollectionSource
	collection: TLCollection
	ordering: TLCollectionItemOrdering
	reversed: boolean
	getItemProps(itemId: TLCollectionItemId): ButtonHTMLAttributes<HTMLButtonElement>
	onOpen(): void
}

/**
 * A collection as a row: its name and count, then its first few items, each placeable, and how many
 * more there are. The name and the count open the whole collection.
 */
export function CollectionPreviewRow({
	source,
	collection,
	ordering,
	reversed,
	getItemProps,
	onOpen,
}: CollectionPreviewRowProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const items = useValue(
		'preview items',
		() => sortItems(source.getItems(collection.id), ordering, reversed),
		[source, collection.id, ordering, reversed]
	)
	const shown = items.length > SLOTS ? items.slice(0, SLOTS - 1) : items
	const rest = items.length - shown.length
	const colorMode = useValue('color mode', () => editor.getColorMode(), [editor])

	return (
		<li className="tlui-collections-preview">
			<button type="button" className="tlui-collections-preview__header" onClick={onOpen}>
				<span className="tlui-collections-preview__name">{collection.name}</span>
				<span className="tlui-collections-preview__count">
					{msg(messages.itemCount, { count: items.length })}
				</span>
				<TldrawUiIcon icon="chevron-right" small label="" />
			</button>
			{items.length === 0 ? (
				<p className="tlui-collections-preview__empty">{msg(messages.empty)}</p>
			) : (
				<ul className="tlui-collections-preview__strip">
					{shown.map((item) => (
						<li key={item.id}>
							<button
								type="button"
								className="tlui-collections-preview__tile"
								aria-label={item.name ?? msg(messages.unnamedItem)}
								title={item.name}
								{...getItemProps(item.id)}
							>
								{item.thumbnail && (
									<img
										src={getThumbnailForColorMode(item.thumbnail, colorMode)}
										alt=""
										draggable={false}
									/>
								)}
							</button>
						</li>
					))}
					{rest > 0 && (
						<li>
							<button
								type="button"
								className="tlui-collections-preview__tile tlui-collections-preview__more"
								aria-label={msg(messages.showAll, { count: items.length, name: collection.name })}
								onClick={onOpen}
							>
								+{rest}
							</button>
						</li>
					)}
				</ul>
			)}
		</li>
	)
}
