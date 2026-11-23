import { defineMessages, useTranslation } from 'tldraw'
import type { TLLibrary } from '../lib/schema'

const messages = defineMessages({
	emptyLibrary: {
		id: 'libraries.empty-library',
		defaultMessage: 'No items yet.',
	},
})

/** @public */
export interface EmptyLibraryProps {
	library: TLLibrary
}

/**
 * A "No items yet." message. The default for {@link LibrariesComponents.EmptyLibrary}.
 * @public @react
 */
export function EmptyLibrary(_props: EmptyLibraryProps) {
	const msg = useTranslation()
	return <p className="tlui-libraries-panel__empty">{msg(messages.emptyLibrary)}</p>
}
