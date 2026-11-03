import { ButtonHTMLAttributes, ReactNode } from 'react'
import { ThumbnailImage, type ThumbnailImageRef } from './thumbnail-image'

/** @public */
export interface ItemTileProps {
	/** Shown as the tile's tooltip. Unnamed items have none. */
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
						<ThumbnailImage
							url={thumbnailUrl}
							sanitize={sanitizeThumbnail}
							resolveImage={resolveThumbnailImage}
						/>
					)}
				</span>
			</button>
			{menu && <div className="tlui-collections-tile__menu">{menu}</div>}
		</div>
	)
}
