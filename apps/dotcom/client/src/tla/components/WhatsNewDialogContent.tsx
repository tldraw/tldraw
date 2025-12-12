import { WhatsNewEntry } from '@tldraw/dotcom-shared'
import Markdown from 'react-markdown'
import { Link } from 'react-router-dom'
import { routes } from '../../routeDefs'
import styles from './dialogs/TlaWhatsNewDialog.module.css'

interface WhatsNewDialogContentProps {
	entry: WhatsNewEntry
	onLinkClick?: () => void
}

export function WhatsNewDialogContent({ entry, onLinkClick }: WhatsNewDialogContentProps) {
	const date = new Date(entry.date)

	return (
		<div className={styles.dialogBody}>
			<div className={styles.title}>
				{entry.title}
				<span className={styles.date}>
					{date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
				</span>
			</div>
			{/* Always use short description in dialog */}
			<div className={styles.description}>
				<Markdown>{entry.description}</Markdown>
			</div>
			<div className={styles.footer}>
				<Link to={routes.whatsNew()} className={styles.moreLink} onClick={onLinkClick}>
					See all updates
				</Link>
			</div>
		</div>
	)
}
