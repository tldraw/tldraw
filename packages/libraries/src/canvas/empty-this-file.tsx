import { defineMessages, useTranslation } from 'tldraw'
import type { LibraryBrowseEntry } from './browse-libraries-dialog'
import { SuggestedLibraries } from './suggested-libraries'

const messages = defineMessages({
	empty: { id: 'libraries.this-file.empty', defaultMessage: 'No libraries added yet.' },
})

/** "This file" with no libraries, and a few to add straight away. */
export function EmptyThisFile({ offers }: { offers: LibraryBrowseEntry[] }) {
	const msg = useTranslation()
	return (
		<div className="tlui-libraries-this-file-empty">
			<p className="tlui-libraries-this-file-empty__text">{msg(messages.empty)}</p>
			<SuggestedLibraries offers={offers} />
		</div>
	)
}
