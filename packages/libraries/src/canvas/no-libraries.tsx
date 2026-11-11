import { defineMessages, useTranslation } from 'tldraw'

const messages = defineMessages({
	empty: { id: 'collections.empty', defaultMessage: 'No collections yet.' },
})

export function NoLibraries() {
	const msg = useTranslation()
	return <p className="tlui-libraries-panel__empty">{msg(messages.empty)}</p>
}
