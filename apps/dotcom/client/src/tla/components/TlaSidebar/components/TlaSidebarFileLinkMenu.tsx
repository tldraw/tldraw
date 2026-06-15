import classNames from 'classnames'
import { TldrawUiButton } from 'tldraw'
import { useMsg } from '../../../utils/i18n'
import { TlaFileMenu } from '../../TlaFileMenu/TlaFileMenu'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { messages } from './sidebar-shared'
import styles from '../sidebar.module.css'

export function TlaSidebarFileLinkMenu({
	fileId,
	workspaceId,
	onRenameAction,
}: {
	fileId: string
	workspaceId: string | null
	onRenameAction(): void
}) {
	const fileMenuLbl = useMsg(messages.fileMenu)

	return (
		<TlaFileMenu
			fileId={fileId}
			workspaceId={workspaceId}
			source="sidebar"
			onRenameAction={onRenameAction}
			contentClassName={classNames(styles.sidebarDropdownMenu, 'tla-sidebar-file-menu')}
			trigger={
				<TldrawUiButton
					type="icon"
					className={styles.sidebarFileListItemMenuTrigger}
					tooltip={fileMenuLbl}
					title={fileMenuLbl}
				>
					<TlaIcon icon="dots-vertical-strong" />
				</TldrawUiButton>
			}
		/>
	)
}
