import { TldrawUiButton, useTranslation } from 'tldraw'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { messages, useHandleSidebarCreateFile } from './sidebar-shared'
import styles from '../sidebar.module.css'

export function TlaSidebarCreateFileButton() {
	const msg = useTranslation()
	const createTitle = msg(messages.create)
	const handleSidebarCreate = useHandleSidebarCreateFile()

	return (
		<TldrawUiButton
			type="icon"
			className={styles.sidebarCreateFileButton}
			onClick={handleSidebarCreate}
			data-testid="tla-create-file"
			tooltip={createTitle}
			title={createTitle}
		>
			<TlaIcon icon="edit-strong" style={{ left: 1 }} />
		</TldrawUiButton>
	)
}
