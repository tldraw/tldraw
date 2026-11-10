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
export interface ItemGridProps {
	/** The grid's tiles: {@link ItemGridItems} for a collection's items, and {@link ItemGridTile}s. */
	children: ReactNode
}

/**
 * A grid of tiles. Put {@link ItemGridItems} in it for the items, and your own tiles in
 * {@link ItemGridTile}s before, after or between them.
 * @public @react
 */
export function ItemGrid({ children }: ItemGridProps) {
	return <ul className="tlui-collections-grid">{children}</ul>
}

/** @public */
export interface ItemGridTileProps {
	children: ReactNode
}

/** One tile in an {@link ItemGrid}. @public @react */
export function ItemGridTile({ children }: ItemGridTileProps) {
	return <li>{children}</li>
}

/** @public */
export interface ItemGridItemsProps<Id extends string = string> {
	items: ItemGridItem<Id>[]
	/** Props for an item's tile button: its click, pointer and drag handlers. */
	getItemProps(id: Id): ButtonHTMLAttributes<HTMLButtonElement>
	/** An item's menu, shown over its tile. Leave it out for tiles without one. */
	renderItemMenu?(item: ItemGridItem<Id>): ReactNode
}

/** A tile for each item, for use in an {@link ItemGrid}. @public @react */
export function ItemGridItems<Id extends string>({
	items,
	getItemProps,
	renderItemMenu,
}: ItemGridItemsProps<Id>) {
	return (
		<>
			{items.map((item) => (
				<ItemGridTile key={item.id}>
					<ItemTile
						name={item.name}
						accessibleLabel={item.accessibleLabel}
						thumbnailUrl={item.thumbnailUrl}
						buttonProps={getItemProps(item.id)}
						menu={renderItemMenu ? renderItemMenu(item) : undefined}
					/>
				</ItemGridTile>
			))}
		</>
	)
}
