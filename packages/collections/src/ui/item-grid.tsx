import { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { ItemTile } from './item-tile'

/** @public */
export interface ItemGridItem<Id extends string = string> {
	id: Id
	/** Shown under the thumbnail when present. */
	name?: string
	/** The tile's accessible name: the item's name, or a description for an unnamed item. */
	accessibleLabel: string
	thumbnailUrl?: string
}

/**
 * How the grid draws its tiles. Every field is optional; the defaults are a grey well behind each
 * thumbnail, two columns, the name below, and the thumbnail contained with an inset.
 * @public
 */
export interface ItemGridAppearance {
	/** `'well'`: a grey well behind the thumbnail. `'card'`: a bordered card. `'plain'`: no background. */
	style?: 'well' | 'card' | 'plain'
	columns?: 2 | 3 | 4
	/** Where the item's name shows: under the tile, over it while hovered, or not at all. */
	label?: 'below' | 'hover' | 'hidden'
	/** `'contain'` shows the whole thumbnail with an inset; `'cover'` fills the tile and crops. */
	fit?: 'contain' | 'cover'
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
	appearance?: ItemGridAppearance
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
	appearance = {},
}: ItemGridProps<Id>) {
	if (items.length === 0) return <p className="tlui-collections-panel__empty">{empty}</p>

	return (
		<ul
			className="tlui-collections-grid"
			data-tile-style={appearance.style ?? 'well'}
			data-tile-label={appearance.label ?? 'below'}
			data-tile-fit={appearance.fit ?? 'contain'}
			data-tile-columns={appearance.columns ?? 2}
			style={{ '--tlui-collections-columns': appearance.columns ?? 2 } as CSSProperties}
		>
			{items.map((item) => (
				<li key={item.id}>
					<ItemTile
						name={item.name}
						accessibleLabel={item.accessibleLabel}
						thumbnailUrl={item.thumbnailUrl}
						buttonProps={getItemProps(item.id)}
						// No menu while renaming: a closing menu hands focus back to its trigger, which would
						// blur the input straight away.
						menu={item.id === renamingId ? undefined : renderItemMenu?.(item)}
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
