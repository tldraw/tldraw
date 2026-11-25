import {
	defineMessages,
	TldrawUiIcon,
	TldrawUiTooltip,
	useTranslation,
	type TLLibrary,
} from 'tldraw'

const messages = defineMessages({
	addSelection: { id: 'libraries.add-selection', defaultMessage: 'Add selection' },
	selectToAdd: { id: 'libraries.select-to-add', defaultMessage: 'Select shapes to add them' },
})

/** @public */
export interface AddSelectionTileProps {
	/** The library the selection is added to. */
	library: TLLibrary
	/** Whether any shapes are selected. */
	hasSelection: boolean
	/** Adds the selected shapes to the library as one item. Does nothing when none are selected. */
	onAddSelection(): void
}

/**
 * A + tile that adds the selected shapes to a library. The default for
 * {@link LibrariesComponents.AddSelectionTile}.
 * @public @react
 */
export function AddSelectionTile({ hasSelection, onAddSelection }: AddSelectionTileProps) {
	const msg = useTranslation()
	const hint = msg(hasSelection ? messages.addSelection : messages.selectToAdd)

	return (
		<div className="tlui-libraries-tile tlui-libraries-add-tile">
			<TldrawUiTooltip content={hint}>
				<button
					type="button"
					className="tlui-libraries-tile__button"
					aria-label={msg(messages.addSelection)}
					aria-description={hasSelection ? undefined : hint}
					aria-disabled={!hasSelection}
					onClick={onAddSelection}
				>
					<span className="tlui-libraries-tile__thumbnail">
						<TldrawUiIcon icon="plus" label="" small />
					</span>
				</button>
			</TldrawUiTooltip>
		</div>
	)
}
