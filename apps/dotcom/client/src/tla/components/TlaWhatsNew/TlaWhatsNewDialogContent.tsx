import { WhatsNewEntry } from '@tldraw/dotcom-shared'
import Markdown from 'react-markdown'
import { Link } from 'react-router-dom'
import { useDialogs } from 'tldraw'
import { routes } from '../../../routeDefs'
import { parseDateOnly } from '../../utils/dates'
import { F } from '../../utils/i18n'
import styles from '../dialogs/TlaWhatsNewDialog.module.css'

interface TlaWhatsNewDialogContentProps {
	entry: WhatsNewEntry
}

export function TlaWhatsNewDialogContent({ entry }: TlaWhatsNewDialogContentProps) {
	const { clearDialogs } = useDialogs()
	const date = parseDateOnly(entry.date)

	return (
		<div className={styles.dialogContent}>
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
				<Link to={routes.whatsNew()} className={styles.moreLink} onClick={clearDialogs}>
					<F defaultMessage="See all updates" />
				</Link>
			</div>
		</div>
	)
}
