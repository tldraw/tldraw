import { ButtonHTMLAttributes, ReactNode, useState } from 'react'

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
	const [loadedUrl, setLoadedUrl] = useState<string>()
	const shownUrl = thumbnailUrl && loadedUrl
	const nextUrl = thumbnailUrl === loadedUrl ? undefined : thumbnailUrl
	return (
		<div className="tlui-libraries-tile">
			<button
				type="button"
				className="tlui-libraries-tile__button"
				aria-label={accessibleLabel}
				title={name}
				{...buttonProps}
			>
				<span className="tlui-libraries-tile__thumbnail">
					{shownUrl && (
						<img key={shownUrl} src={shownUrl} alt="" draggable={false} decoding="async" />
					)}
					{nextUrl && (
						<img
							key={nextUrl}
							src={nextUrl}
							alt=""
							draggable={false}
							loading="lazy"
							decoding="async"
							data-loading={shownUrl ? true : undefined}
							onLoad={() => setLoadedUrl(nextUrl)}
						/>
					)}
				</span>
			</button>
			{menu && <div className="tlui-libraries-tile__menu">{menu}</div>}
		</div>
	)
}
