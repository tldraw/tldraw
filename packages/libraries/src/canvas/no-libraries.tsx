import { defineMessages, useTranslation } from 'tldraw'
import type { TLLibraryOwner } from '../lib/LibrarySource'
import type { NewLibraryAction } from './libraries-panel-header'

const messages = defineMessages({
	empty: { id: 'libraries.empty', defaultMessage: 'No libraries yet.' },
})

/** @public */
export interface NoLibrariesProps {
	/** The tab's owner, when the source has two or more. */
	owner?: TLLibraryOwner
	/** Creates a library for the tab's owner. Left out when creating one there isn't allowed. */
	newLibrary?: NewLibraryAction
}

/**
 * A "No libraries yet." message. The default for {@link LibrariesComponents.NoLibraries}.
 * @public @react
 */
export function NoLibraries(_props: NoLibrariesProps) {
	const msg = useTranslation()
	return <p className="tlui-libraries-panel__empty">{msg(messages.empty)}</p>
}
