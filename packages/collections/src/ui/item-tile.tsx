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
	/** Shown under the thumbnail and used as the button's accessible name. */
	label: string
	thumbnailUrl?: string
	/** Props for the tile's button: its click, pointer and drag handlers. */
	buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>
	/** Shown over the tile's corner on hover, e.g. an {@link ItemMenu}. */
	menu?: ReactNode
	/** Set while the item is being renamed: the label becomes an input. */
	renaming?: ItemTileRenaming
}

/** @public @react */
export function ItemTile({ label, thumbnailUrl, buttonProps, menu, renaming }: ItemTileProps) {
	const thumbnail = (
		<span className="tlui-collections-tile__thumbnail">
			{thumbnailUrl && <img src={thumbnailUrl} alt="" draggable={false} />}
		</span>
	)

	return (
		<div className="tlui-collections-tile">
			{renaming ? (
				<>
					<button type="button" className="tlui-collections-tile__button" {...buttonProps}>
						{thumbnail}
					</button>
					<RenameInput className="tlui-collections-tile__input" {...renaming} />
				</>
			) : (
				<button type="button" className="tlui-collections-tile__button" {...buttonProps}>
					{thumbnail}
					<span className="tlui-collections-tile__label">{label}</span>
				</button>
			)}
			{menu && <div className="tlui-collections-tile__menu">{menu}</div>}
		</div>
	)
}
