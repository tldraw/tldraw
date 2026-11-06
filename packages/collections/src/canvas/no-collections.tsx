import { defineMessages, useTranslation } from 'tldraw'

const messages = defineMessages({
	empty: { id: 'collections.empty', defaultMessage: 'No collections yet.' },
})

/** The panel's body when the source has no collections. */
export function NoCollections() {
	const msg = useTranslation()
	return (
		<div className="tlui-collections-panel__empty">
			<p>{msg(messages.empty)}</p>
		</div>
	)
}
