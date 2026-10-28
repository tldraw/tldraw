import { ButtonHTMLAttributes, ReactNode } from 'react'
import { ItemTile } from './item-tile'

/** @public */
export interface ItemGridItem<Id extends string = string> {
	id: Id
	label: string
	thumbnailUrl?: string
}

/** @public */
export interface ItemGridProps<Id extends string = string> {
	items: ItemGridItem<Id>[]
	/** Props for an item's tile button: its click, pointer and drag handlers. */
	getItemProps(id: Id): ButtonHTMLAttributes<HTMLButtonElement>
	/** Shown when there are no items. */
	empty: ReactNode
}

/** @public @react */
export function ItemGrid<Id extends string>({ items, getItemProps, empty }: ItemGridProps<Id>) {
	if (items.length === 0) return <p className="tlui-collections-panel__empty">{empty}</p>

	return (
		<ul className="tlui-collections-grid">
			{items.map((item) => (
				<li key={item.id}>
					<ItemTile
						label={item.label}
						thumbnailUrl={item.thumbnailUrl}
						{...getItemProps(item.id)}
					/>
				</li>
			))}
		</ul>
	)
}
