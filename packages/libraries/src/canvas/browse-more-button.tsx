import { forwardRef } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	useTranslation,
} from 'tldraw'

const messages = defineMessages({
	addLibraries: { id: 'libraries.add-libraries', defaultMessage: 'Add libraries' },
})

/** The panel's footer button that opens the libraries to browse. */
export const BrowseMoreButton = forwardRef<HTMLButtonElement, { onBrowse(): void }>(
	function BrowseMoreButton({ onBrowse }, ref) {
		const msg = useTranslation()
		const label = msg(messages.addLibraries)

		return (
			<TldrawUiButton
				ref={ref}
				type="menu"
				className="tlui-libraries-panel__footer tlui-libraries-panel__browse-more"
				title={label}
				onClick={onBrowse}
			>
				<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
				<TldrawUiButtonIcon icon="plus" small />
			</TldrawUiButton>
		)
	}
)
