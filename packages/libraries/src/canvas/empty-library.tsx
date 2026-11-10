import { defineMessages, useTranslation, type TLLibrary } from 'tldraw'

const messages = defineMessages({
	emptyLibrary: {
		id: 'libraries.empty-library',
		defaultMessage: 'Nothing saved here yet.',
	},
})

/** @public */
export interface EmptyLibraryProps {
	library: TLLibrary
}

/**
 * A "Nothing saved here yet." message. The default for {@link LibrariesComponents.EmptyLibrary}.
 * @public @react
 */
export function EmptyLibrary(_props: EmptyLibraryProps) {
	const msg = useTranslation()
	return <p className="tlui-libraries-panel__empty">{msg(messages.emptyLibrary)}</p>
}
