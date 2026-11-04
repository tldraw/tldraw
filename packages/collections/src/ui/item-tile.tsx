import { ButtonHTMLAttributes, ReactNode } from 'react'
import { RenameInput } from './rename-input'

/** @public */
export interface ItemTileRenaming {
	defaultValue: string
	onComplete(name: string): void
	onCancel(): void
}

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
	/** Set while the item is being renamed: an input shows under the thumbnail. */
	renaming?: ItemTileRenaming
}

/** @public @react */
export function ItemTile({
	name,
	accessibleLabel,
	thumbnailUrl,
	buttonProps,
	menu,
	renaming,
}: ItemTileProps) {
	const thumbnail = (
		<span className="tlui-collections-tile__thumbnail">
			{thumbnailUrl && <img src={thumbnailUrl} alt="" draggable={false} />}
		</span>
	)

	return (
		<div className="tlui-collections-tile">
			{renaming ? (
				<>
					<button
						type="button"
						className="tlui-collections-tile__button"
						aria-label={accessibleLabel}
						{...buttonProps}
					>
						{thumbnail}
					</button>
					<RenameInput className="tlui-collections-tile__input" {...renaming} />
				</>
			) : (
				<button
					type="button"
					className="tlui-collections-tile__button"
					aria-label={accessibleLabel}
					title={name}
					{...buttonProps}
				>
					{thumbnail}
				</button>
			)}
			{menu && <div className="tlui-collections-tile__menu">{menu}</div>}
		</div>
	)
}
