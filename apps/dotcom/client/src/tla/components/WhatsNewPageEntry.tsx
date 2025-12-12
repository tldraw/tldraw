import { WhatsNewEntry } from '@tldraw/dotcom-shared'
import Markdown from 'react-markdown'
import styles from '../../pages/whats-new.module.css'

interface WhatsNewPageEntryProps {
	entry: WhatsNewEntry
}

export function WhatsNewPageEntry({ entry }: WhatsNewPageEntryProps) {
	const date = new Date(entry.date)
	// Use long description if available, otherwise fallback to short description
	const displayDescription = entry.fullDescription || entry.description

	return (
		<div className={styles.entry}>
			<div className={styles.entryMeta}>
				<h2 className={styles.entryTitle}>{entry.title}</h2>
				<span className={styles.date}>
					{date.toLocaleDateString('en-US', {
						month: 'short',
						year: 'numeric',
					})}
				</span>
			</div>
			<div className={styles.entryMain}>
				<div className={styles.entryContent}>
					<Markdown>{displayDescription}</Markdown>
				</div>
			</div>
		</div>
	)
}
