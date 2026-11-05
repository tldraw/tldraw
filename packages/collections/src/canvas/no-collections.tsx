import { defineMessages, TldrawUiButton, TldrawUiButtonLabel, useTranslation } from 'tldraw'

const messages = defineMessages({
	empty: { id: 'collections.empty', defaultMessage: 'No collections yet.' },
	browse: { id: 'collections.empty-browse', defaultMessage: 'Browse collections' },
})

/** The panel's body when the source has no collections. */
export function NoCollections({
	onBrowse,
}: {
	/** Set to offer a button that opens the catalogue of packs. */
	onBrowse?(): void
}) {
	const msg = useTranslation()
	return (
		<div className="tlui-collections-panel__empty">
			<p>{msg(messages.empty)}</p>
			{onBrowse && (
				<TldrawUiButton type="primary" onClick={onBrowse}>
					<TldrawUiButtonLabel>{msg(messages.browse)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			)}
		</div>
	)
}
