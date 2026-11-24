import type { Ref } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	useTranslation,
} from 'tldraw'
import { OpenBookIcon } from '../ui/open-book-icon'

const messages = defineMessages({
	browseMore: { id: 'libraries.browse-more', defaultMessage: 'Browse more libraries' },
})

/** The panel's footer button that opens the libraries to browse. */
export function BrowseMoreButton({
	onBrowse,
	ref,
}: {
	onBrowse(): void
	ref?: Ref<HTMLButtonElement>
}) {
	const msg = useTranslation()
	const label = msg(messages.browseMore)

	return (
		<TldrawUiButton
			ref={ref}
			type="menu"
			className="tlui-libraries-panel__footer tlui-libraries-panel__browse-more"
			title={label}
			onClick={onBrowse}
		>
			<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
			<TldrawUiButtonIcon icon={<OpenBookIcon />} small />
		</TldrawUiButton>
	)
}
