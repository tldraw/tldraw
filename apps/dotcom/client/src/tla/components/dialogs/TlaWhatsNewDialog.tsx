import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useDialogs,
} from 'tldraw'
import { useWhatsNew } from '../../hooks/useWhatsNew'
import { WhatsNewDialogContent } from '../WhatsNewDialogContent'
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

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<WhatsNewDialogContent entry={latestEntry} onLinkClick={clearDialogs} />
			</TldrawUiDialogBody>
		</>
	)
}
