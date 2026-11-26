import { ButtonHTMLAttributes, ReactNode, useState } from 'react'
import { TldrawUiIcon, TldrawUiTooltip } from 'tldraw'

/** @public */
export interface ItemTileProps {
	/** Shown as the tile's tooltip. Unnamed items have none. */
	name?: string
	/** The button's accessible name: the item's name, or a description for an unnamed item. */
	accessibleLabel: string
	thumbnailUrl?: string
	/** Props for the tile's button: its click, pointer and drag handlers. */
	buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>
	/**
	 * The item's menu, e.g. an {@link ItemMenu} with `trigger="none"`, which opens over the tile on a
	 * right-click.
	 */
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
			<TldrawUiTooltip content={name} side="bottom">
				<button
					type="button"
					className="tlui-libraries-tile__button"
					aria-label={accessibleLabel}
					{...buttonProps}
				>
					<span className="tlui-libraries-tile__thumbnail">
						{!thumbnailUrl && (
							<span className="tlui-libraries-tile__placeholder">
								{name ?? <TldrawUiIcon icon="pack" label="" small />}
							</span>
						)}
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
			</TldrawUiTooltip>
			{menu && <div className="tlui-libraries-tile__menu">{menu}</div>}
		</div>
	)
}
