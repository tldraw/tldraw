import { ButtonHTMLAttributes, ReactNode } from 'react'

/** @public */
export interface ItemTileProps {
	/** Shown as the tile's tooltip. Unnamed items have none. */
	name?: string
	/** The button's accessible name: the item's name, or a description for an unnamed item. */
	accessibleLabel: string
	thumbnailUrl?: string
	/** Props for the tile's button: its click, pointer and drag handlers. */
	buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>
	/** Shown over the tile's corner on hover, e.g. an {@link ItemMenu}. */
	menu?: ReactNode
}

/** @public @react */
export function ItemTile({
	name,
	accessibleLabel,
	thumbnailUrl,
	buttonProps,
	menu,
}: ItemTileProps) {
	return (
		<div className="tlui-collections-tile">
			<button
				type="button"
				className="tlui-collections-tile__button"
				aria-label={accessibleLabel}
				title={name}
				{...buttonProps}
			>
				<span className="tlui-collections-tile__thumbnail">
					{thumbnailUrl && (
						<img src={thumbnailUrl} alt="" draggable={false} loading="lazy" decoding="async" />
					)}
				</span>
			</button>
			{menu && <div className="tlui-collections-tile__menu">{menu}</div>}
		</div>
	)
}
