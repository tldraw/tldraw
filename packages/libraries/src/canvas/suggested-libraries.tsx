import { defineMessages, TldrawUiButton, TldrawUiButtonLabel, useTranslation } from 'tldraw'
import { LibraryIcon } from '../ui/library-icon'
import { type LibraryBrowseEntry, useAdd } from './browse-libraries-dialog'

const messages = defineMessages({
	suggested: { id: 'libraries.this-file.suggested', defaultMessage: 'Suggested libraries' },
	itemCount: {
		id: 'libraries.browse.item-count',
		defaultMessage: '{count, plural, one {# item} other {# items}}',
	},
	add: { id: 'libraries.this-file.add', defaultMessage: 'Add' },
})

/** A few of the host's browse entries to add to "This file" straight away. Nothing without any. */
export function SuggestedLibraries({ offers }: { offers: LibraryBrowseEntry[] }) {
	const msg = useTranslation()
	if (offers.length === 0) return null
	return (
		<section className="tlui-libraries-offers" aria-label={msg(messages.suggested)}>
			<h4 className="tlui-libraries-offers__heading">{msg(messages.suggested)}</h4>
			<ul className="tlui-libraries-offers__list">
				{offers.map((entry) => (
					<li key={entry.id}>
						<Offer entry={entry} />
					</li>
				))}
			</ul>
		</section>
	)
}

function Offer({ entry }: { entry: LibraryBrowseEntry }) {
	const msg = useTranslation()
	const { adding, run } = useAdd(entry.add)
	return (
		<div className="tlui-libraries-offer">
			<span className="tlui-libraries-offer__icon" aria-hidden>
				<LibraryIcon />
			</span>
			<span className="tlui-libraries-offer__text">
				<span className="tlui-libraries-offer__name">{entry.name}</span>
				<span className="tlui-libraries-offer__detail">
					{msg(messages.itemCount, { count: entry.itemCount })}
				</span>
			</span>
			<TldrawUiButton
				type="normal"
				className="tlui-libraries-offer__add"
				disabled={adding}
				onClick={run}
				aria-label={`${msg(messages.add)} ${entry.name}`}
			>
				<TldrawUiButtonLabel>{msg(messages.add)}</TldrawUiButtonLabel>
			</TldrawUiButton>
		</div>
	)
}
