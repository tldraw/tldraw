import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	useTranslation,
} from 'tldraw'

const messages = defineMessages({
	addMore: { id: 'libraries.add-more', defaultMessage: 'Add more libraries' },
})

/** The panel's "Add more libraries" button, which opens the libraries to browse. */
export function AddMoreButton({ onBrowse }: { onBrowse(): void }) {
	const msg = useTranslation()
	const label = msg(messages.addMore)

	return (
		<TldrawUiButton
			type="menu"
			className="tlui-libraries-panel__add-more"
			title={label}
			onClick={onBrowse}
		>
			<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
			<TldrawUiButtonIcon icon="plus" small />
		</TldrawUiButton>
	)
}
