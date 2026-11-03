import { ButtonHTMLAttributes, ReactNode } from 'react'
import { RenameInput } from './rename-input'
import { ThumbnailImage, type ThumbnailImageRef } from './thumbnail-image'

/** @public */
export interface ItemTileRenaming {
	defaultValue: string
	onComplete(name: string): void
	onCancel(): void
}

/** @public */
export interface ItemTileProps {
	/** Shown under the thumbnail. Unnamed items show no label. */
	name?: string
	/** The button's accessible name: the item's name, or a description for an unnamed item. */
	accessibleLabel: string
	thumbnailUrl?: string
	/** Cleans a stored SVG thumbnail before it's drawn. See {@link CollectionsPanelProps.sanitizeThumbnail}. */
	sanitizeThumbnail?(svg: string): string
	/** Gives the URL for an image the thumbnail points at. */
	resolveThumbnailImage?(ref: ThumbnailImageRef): Promise<string | null>
	/** Props for the tile's button: its click, pointer and drag handlers. */
	buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>
	/** Shown over the tile's corner on hover, e.g. an {@link ItemMenu}. */
	menu?: ReactNode
	/** Set while the item is being renamed: the label becomes an input. */
	renaming?: ItemTileRenaming
}

/** @public @react */
export function ItemTile({
	name,
	accessibleLabel,
	thumbnailUrl,
	sanitizeThumbnail,
	resolveThumbnailImage,
	buttonProps,
	menu,
	renaming,
}: ItemTileProps) {
	const thumbnail = (
		<span className="tlui-collections-tile__thumbnail">
			{thumbnailUrl && (
				<ThumbnailImage
					url={thumbnailUrl}
					sanitize={sanitizeThumbnail}
					resolveImage={resolveThumbnailImage}
				/>
			)}
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
					{...buttonProps}
				>
					{thumbnail}
					{name && <span className="tlui-collections-tile__label">{name}</span>}
				</button>
			)}
			{menu && <div className="tlui-collections-tile__menu">{menu}</div>}
		</div>
	)
}
