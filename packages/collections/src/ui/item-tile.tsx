import { ButtonHTMLAttributes } from 'react'

/** @public */
export interface ItemTileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	/** Shown under the thumbnail and used as the button's accessible name. */
	label: string
	thumbnailUrl?: string
}

/** @public @react */
export function ItemTile({ label, thumbnailUrl, ...buttonProps }: ItemTileProps) {
	return (
		<button type="button" className="tlui-collections-tile" {...buttonProps}>
			<span className="tlui-collections-tile__thumbnail">
				{thumbnailUrl && <img src={thumbnailUrl} alt="" draggable={false} />}
			</span>
			<span className="tlui-collections-tile__label">{label}</span>
		</button>
	)
}
