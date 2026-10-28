import { ButtonHTMLAttributes, ReactNode } from 'react'
import { ItemTile } from './item-tile'

/** @public */
export interface ItemGridItem<Id extends string = string> {
	id: Id
	label: string
	/** The item's own name, if it has one. Renaming starts from it rather than from `label`. */
	name?: string
	thumbnailUrl?: string
}

/** @public */
export interface ItemGridProps<Id extends string = string> {
	items: ItemGridItem<Id>[]
	/** Props for an item's tile button: its click, pointer and drag handlers. */
	getItemProps(id: Id): ButtonHTMLAttributes<HTMLButtonElement>
	/** An item's menu, shown over its tile. Leave it out for tiles without one. */
	renderItemMenu?(item: ItemGridItem<Id>): ReactNode
	/** The item being renamed, whose label is an input. */
	renamingId?: Id
	onRename?(id: Id, name: string): void
	onCancelRename?(): void
	/** Shown when there are no items. */
	empty: ReactNode
}

/** @public @react */
export function ItemGrid<Id extends string>({
	items,
	getItemProps,
	renderItemMenu,
	renamingId,
	onRename,
	onCancelRename,
	empty,
}: ItemGridProps<Id>) {
	if (items.length === 0) return <p className="tlui-collections-panel__empty">{empty}</p>

	return (
		<ul className="tlui-collections-grid">
			{items.map((item) => (
				<li key={item.id}>
					<ItemTile
						label={item.label}
						thumbnailUrl={item.thumbnailUrl}
						buttonProps={getItemProps(item.id)}
						menu={renderItemMenu?.(item)}
						renaming={
							item.id === renamingId && onRename && onCancelRename
								? {
										defaultValue: item.name ?? '',
										onComplete: (name) => onRename(item.id, name),
										onCancel: onCancelRename,
									}
								: undefined
						}
					/>
				</li>
			))}
		</ul>
	)
}
