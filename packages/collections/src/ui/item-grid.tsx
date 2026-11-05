import { ButtonHTMLAttributes, ReactNode } from 'react'
import { ItemTile } from './item-tile'

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
	/** An item's menu, shown over its tile. Leave it out for tiles without one. */
	renderItemMenu?(item: ItemGridItem<Id>): ReactNode
	/** Shown when there are no items and nothing comes after them. */
	empty: ReactNode
	/** A tile after the items, such as one that adds to the collection. */
	after?: ReactNode
}

/**
 * Items as a grid of thumbnails, two to a row, each with its name as a tooltip.
 * @public @react
 */
export function ItemGrid<Id extends string>({
	items,
	getItemProps,
	renderItemMenu,
	empty,
	after,
}: ItemGridProps<Id>) {
	if (items.length === 0 && !after) return <p className="tlui-collections-panel__empty">{empty}</p>

	return (
		<ul className="tlui-collections-grid">
			{items.map((item) => (
				<li key={item.id}>
					<ItemTile
						name={item.name}
						accessibleLabel={item.accessibleLabel}
						thumbnailUrl={item.thumbnailUrl}
						buttonProps={getItemProps(item.id)}
						menu={renderItemMenu?.(item)}
					/>
				</li>
			))}
			{after && <li>{after}</li>}
		</ul>
	)
}
