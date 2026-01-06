import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { useWhatsNew } from '../../hooks/useWhatsNew'
import { F } from '../../utils/i18n'
import { TlaWhatsNewDialogContent } from '../TlaWhatsNew/TlaWhatsNewDialogContent'
import styles from './TlaWhatsNewDialog.module.css'

export function TlaWhatsNewDialog() {
	const { entries } = useWhatsNew()

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
					<div className={styles.dialogContent}>
						<F defaultMessage="No updates available" />
					</div>
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
			<TldrawUiDialogBody className={styles.dialogBody}>
				<TlaWhatsNewDialogContent entry={latestEntry} />
			</TldrawUiDialogBody>
		</>
	)
}
