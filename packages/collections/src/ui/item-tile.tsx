import { ButtonHTMLAttributes, ReactNode, useEffect, useRef } from 'react'
import { TldrawUiInput } from 'tldraw'

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
	// Enter completes the rename and unmounts the input, which then blurs: finish only once.
	const finished = useRef(false)
	useEffect(() => {
		if (renaming) finished.current = false
	}, [renaming])
	const finish = (complete: () => void) => {
		if (finished.current) return
		finished.current = true
		complete()
	}

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
					<TldrawUiInput
						className="tlui-collections-tile__input"
						defaultValue={renaming.defaultValue}
						autoFocus
						autoSelect
						onComplete={(name) => finish(() => renaming.onComplete(name))}
						onBlur={(name) => finish(() => renaming.onComplete(name))}
						onCancel={() => finish(renaming.onCancel)}
					/>
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
