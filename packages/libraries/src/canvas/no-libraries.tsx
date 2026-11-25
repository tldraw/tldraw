import { defineMessages, useTranslation } from 'tldraw'

const messages = defineMessages({
	empty: { id: 'libraries.empty', defaultMessage: 'No libraries yet.' },
})

/**
 * A "No libraries yet." message. The default for {@link LibrariesComponents.NoLibraries}.
 * @public @react
 */
export function NoLibraries() {
	const msg = useTranslation()
	return <p className="tlui-libraries-panel__empty">{msg(messages.empty)}</p>
}
