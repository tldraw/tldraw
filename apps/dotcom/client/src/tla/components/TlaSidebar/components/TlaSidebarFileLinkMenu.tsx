import { useIntl } from 'react-intl'
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
	const intl = useIntl()
	const fileMenuLbl = intl.formatMessage(messages.fileMenu)

	return (
		<TlaFileMenu
			fileId={fileId}
			source="sidebar"
			onRenameAction={onRenameAction}
			trigger={
				<button className={styles.linkMenu} title={fileMenuLbl}>
					<TlaIcon icon="dots-vertical-strong" />
				</button>
			}
		/>
	)
}
