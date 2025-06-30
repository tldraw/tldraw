import { useMsg } from '../../../utils/i18n'
import { TlaFileMenu } from '../../TlaFileMenu/TlaFileMenu'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { messages } from './sidebar-shared'

export function TlaSidebarFileLinkMenu({
	fileId,
	onRenameAction,
}: {
	fileId: string
	onRenameAction(): void
}) {
	const fileMenuLbl = useMsg(messages.fileMenu)

	return (
		<TlaFileMenu
			fileId={fileId}
			source="sidebar"
			onRenameAction={onRenameAction}
			trigger={
				<button className={styles.sidebarFileListItemMenuTrigger} title={fileMenuLbl}>
					<TlaIcon icon="dots-vertical-strong" />
				</button>
			}
		/>
	)
}
