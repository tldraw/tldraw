import Markdown from 'react-markdown'
import { Link } from 'react-router-dom'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useDialogs,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { useWhatsNew } from '../../hooks/useWhatsNew'
import styles from './TlaWhatsNewDialog.module.css'

export function TlaWhatsNewDialog() {
	const { entries } = useWhatsNew()
	const { clearDialogs } = useDialogs()

	const latestEntry = entries[0]

	if (!latestEntry) {
		return (
			<>
				<TldrawUiDialogHeader>
					<TldrawUiDialogTitle>
						<span />
					</TldrawUiDialogTitle>
					<TldrawUiDialogCloseButton />
				</TldrawUiDialogHeader>
				<TldrawUiDialogBody className={styles.dialogBody}>
					<div>No updates available</div>
				</TldrawUiDialogBody>
			</>
		)
	}

	const date = new Date(latestEntry.date)

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.dialogBody}>
				<div className={styles.title}>
					{latestEntry.title}
					<span className={styles.date}>
						{date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
					</span>
				</div>
				<div className={styles.description}>
					<Markdown>{latestEntry.description}</Markdown>
				</div>
				<div className={styles.footer}>
					<Link to={routes.whatsNew()} className={styles.moreLink} onClick={clearDialogs}>
						See all updates
					</Link>
				</div>
			</TldrawUiDialogBody>
		</>
	)
}
