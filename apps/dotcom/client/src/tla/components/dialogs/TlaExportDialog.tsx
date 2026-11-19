import { Tooltip as _Tooltip } from 'radix-ui'
import {
	F,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { TlaExportTab } from '../TlaFileShareMenu/Tabs/TlaExportTab'
import styles from './dialogs.module.css'

/** The share menu's Export tab on its own, for File → Export… in Andy's main menu. */
export function TlaExportDialog() {
	return (
		<_Tooltip.Provider>
			<div className={styles.dialogContainer}>
				<TldrawUiDialogHeader>
					<TldrawUiDialogTitle>
						<F defaultMessage="Export" />
					</TldrawUiDialogTitle>
					<TldrawUiDialogCloseButton />
				</TldrawUiDialogHeader>
				<TldrawUiDialogBody className={styles.dialogBody}>
					<TlaExportTab />
				</TldrawUiDialogBody>
			</div>
		</_Tooltip.Provider>
	)
}
