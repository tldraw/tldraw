import { defineMessages, useTranslation } from 'tldraw'

const messages = defineMessages({
	empty: { id: 'collections.empty', defaultMessage: 'No collections yet.' },
})

export function NoCollections() {
	const msg = useTranslation()
	return <p className="tlui-collections-panel__empty">{msg(messages.empty)}</p>
}
