import { ButtonHTMLAttributes, ReactNode } from 'react'
import { ItemTile } from './item-tile'
import type { ThumbnailImageRef } from './thumbnail-image'

/** @public */
export interface ItemGridItem<Id extends string = string> {
	id: Id
	/** Shown as the tile's tooltip and at the top of its menu when present. */
	name?: string
	/** The tile's accessible name: the item's name, or a description for an unnamed item. */
	accessibleLabel: string
	thumbnailUrl?: string
}

/** @public */
export interface ItemGridProps<Id extends string = string> {
	items: ItemGridItem<Id>[]
	/** Props for an item's tile button: its click, pointer and drag handlers. */
	getItemProps(id: Id): ButtonHTMLAttributes<HTMLButtonElement>
	/** Cleans a stored SVG thumbnail before it's drawn. See {@link CollectionsPanelProps.sanitizeThumbnail}. */
	sanitizeThumbnail?(svg: string): string
	/** Gives the URL for an image an item's thumbnail points at. */
	resolveThumbnailImage?(id: Id, ref: ThumbnailImageRef): Promise<string | null>
	/** An item's menu, shown over its tile. Leave it out for tiles without one. */
	renderItemMenu?(item: ItemGridItem<Id>): ReactNode
	/** Shown when there are no items. */
	empty: ReactNode
}

/** @public @react */
export function ItemGrid<Id extends string>({
	items,
	getItemProps,
	sanitizeThumbnail,
	resolveThumbnailImage,
	renderItemMenu,
	empty,
}: ItemGridProps<Id>) {
	if (items.length === 0) return <p className="tlui-collections-panel__empty">{empty}</p>

	return (
		<ul className="tlui-collections-grid">
			{items.map((item) => (
				<li key={item.id}>
					<ItemTile
						name={item.name}
						accessibleLabel={item.accessibleLabel}
						thumbnailUrl={item.thumbnailUrl}
						sanitizeThumbnail={sanitizeThumbnail}
						resolveThumbnailImage={
							resolveThumbnailImage && ((ref) => resolveThumbnailImage(item.id, ref))
						}
						buttonProps={getItemProps(item.id)}
						menu={renderItemMenu?.(item)}
					/>
				</li>
			))}
		</ul>
	)
}
