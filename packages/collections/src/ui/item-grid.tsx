import { ReactNode } from 'react'
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
	onSelectItem(id: Id): void
	/** Shown when there are no items. */
	empty: ReactNode
}

/** @public @react */
export function ItemGrid<Id extends string>({ items, onSelectItem, empty }: ItemGridProps<Id>) {
	if (items.length === 0) return <p className="tlui-collections-panel__empty">{empty}</p>

	return (
		<ul className="tlui-collections-grid">
			{items.map((item) => (
				<li key={item.id}>
					<ItemTile
						label={item.label}
						thumbnailUrl={item.thumbnailUrl}
						onSelect={() => onSelectItem(item.id)}
					/>
				</li>
			))}
		</ul>
	)
}
