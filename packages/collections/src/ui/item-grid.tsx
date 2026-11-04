import { ButtonHTMLAttributes, CSSProperties, ReactNode, useEffect, useRef } from 'react'
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

/**
 * How the grid draws its tiles. Every field is optional; the defaults are a thumbnail on the
 * canvas's background colour, two columns, no name, and the thumbnail contained with an inset.
 * @public
 */
export interface ItemGridAppearance {
	/**
	 * `'well'`: the thumbnail on the canvas's background colour. `'card'`: a bordered card.
	 * `'plain'`: no background.
	 */
	style?: 'well' | 'card' | 'plain'
	columns?: 2 | 3 | 4
	/**
	 * Where the item's name shows on the tile: nowhere (it heads the item's menu), under the
	 * thumbnail, or over it while hovered.
	 */
	label?: 'hidden' | 'below' | 'hover'
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
	/** An item to scroll into view and flash, e.g. one just saved. */
	highlightedId?: Id
	/** Shown when there are no items. */
	empty: ReactNode
	appearance?: ItemGridAppearance
}

/** @public @react */
export function ItemGrid<Id extends string>({
	items,
	getItemProps,
	renderItemMenu,
	highlightedId,
	empty,
	appearance = {},
}: ItemGridProps<Id>) {
	const listRef = useRef<HTMLUListElement>(null)
	useEffect(() => {
		if (!highlightedId || !listRef.current) return
		const highlighted = listRef.current.querySelector('[data-highlighted]')
		if (highlighted) highlighted.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
	}, [highlightedId])

	const label = appearance.label ?? 'hidden'
	const columns = appearance.columns ?? 2
	if (items.length === 0) return <p className="tlui-collections-panel__empty">{empty}</p>

	return (
		<ul
			ref={listRef}
			className="tlui-collections-grid"
			data-tile-style={appearance.style ?? 'well'}
			data-tile-label={label}
			data-tile-fit={appearance.fit ?? 'contain'}
			data-tile-columns={columns}
			style={{ '--tlui-collections-columns': columns } as CSSProperties}
		>
			{items.map((item) => (
				<li key={item.id} data-highlighted={item.id === highlightedId || undefined}>
					<ItemTile
						name={item.name}
						accessibleLabel={item.accessibleLabel}
						thumbnailUrl={item.thumbnailUrl}
						showLabel={label !== 'hidden'}
						buttonProps={getItemProps(item.id)}
						menu={renderItemMenu?.(item)}
					/>
				</li>
			))}
		</ul>
	)
}
