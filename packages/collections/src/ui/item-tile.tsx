/** @public */
export interface ItemTileProps {
	/** Shown under the thumbnail and used as the button's accessible name. */
	label: string
	thumbnailUrl?: string
	onSelect(): void
}

/** @public @react */
export function ItemTile({ label, thumbnailUrl, onSelect }: ItemTileProps) {
	return (
		<button type="button" className="tlui-collections-tile" onClick={onSelect}>
			<span className="tlui-collections-tile__thumbnail">
				{thumbnailUrl && <img src={thumbnailUrl} alt="" draggable={false} />}
			</span>
			<span className="tlui-collections-tile__label">{label}</span>
		</button>
	)
}
