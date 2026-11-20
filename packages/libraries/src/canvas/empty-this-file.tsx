import { defineMessages, TldrawUiButton, TldrawUiButtonLabel, useTranslation } from 'tldraw'
import { LibraryIcon } from '../ui/library-icon'
import { type LibraryBrowseEntry, useAdd } from './browse-libraries-dialog'

const messages = defineMessages({
	empty: { id: 'libraries.this-file.empty', defaultMessage: 'No libraries added yet.' },
	suggested: { id: 'libraries.this-file.suggested', defaultMessage: 'Suggested libraries' },
	itemCount: {
		id: 'libraries.browse.item-count',
		defaultMessage: '{count, plural, one {# item} other {# items}}',
	},
	add: { id: 'libraries.this-file.add', defaultMessage: 'Add' },
})

/** "This file" with no libraries, and a few to add straight away. */
export function EmptyThisFile({ offers }: { offers: LibraryBrowseEntry[] }) {
	const msg = useTranslation()
	return (
		<div className="tlui-libraries-this-file-empty">
			<p className="tlui-libraries-this-file-empty__text">{msg(messages.empty)}</p>
			{offers.length > 0 && (
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
			)}
		</div>
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
