import classNames from 'classnames'
import { CSSProperties, useCallback } from 'react'
import { useDialogs } from 'tldraw'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { WorkspaceSettingsDialog } from '../../dialogs/WorkspaceSettingsDialog'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { useHandleSidebarCreateFile } from './TlaSidebarCreateFileButton'
import { TlaSidebarSearch } from './TlaSidebarSearch'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	newFile: { defaultMessage: 'New file' },
	workspaceSettings: { defaultMessage: 'Manage' },
})

/**
 * The action rows shown below the workspace switcher. Both the home space and
 * non-home workspaces get the search, new-board, and settings actions. (The home
 * workspace's settings are limited: it can be renamed but not shared or managed —
 * see WorkspaceSettingsDialog.)
 */
export function TlaSidebarWorkspaceActions({ workspaceId }: { workspaceId: string }) {
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const handleCreateFile = useHandleSidebarCreateFile()
	const newBoardLbl = useMsg(messages.newFile)
	const settingsLbl = useMsg(messages.workspaceSettings)

	const handleSettings = useCallback(() => {
		addDialog({
			component: ({ onClose }) => (
				<WorkspaceSettingsDialog workspaceId={workspaceId} onClose={onClose} />
			),
		})
		trackEvent('open-share-menu', { source: 'sidebar' })
	}, [addDialog, workspaceId, trackEvent])

	return (
		<div className={styles.sidebarSection}>
			<TlaSidebarSearch />
			<TlaSidebarActionButton
				icon="edit"
				label={newBoardLbl}
				onClick={handleCreateFile}
				testId="tla-sidebar-new-board"
			/>
			<TlaSidebarActionButton
				icon="settings"
				label={settingsLbl}
				onClick={handleSettings}
				testId="tla-sidebar-workspace-settings"
			/>
		</div>
	)
}

function TlaSidebarActionButton({
	icon,
	iconStyle,
	label,
	onClick,
	testId,
}: {
	icon: string
	iconStyle?: CSSProperties
	label: string
	onClick(): void
	testId: string
}) {
	return (
		<button
			className={classNames(styles.sidebarActionButton, styles.hoverable, 'tla-text_ui__regular')}
			onClick={onClick}
			data-testid={testId}
		>
			<TlaIcon icon={icon} style={iconStyle} />
			<span className={styles.sidebarActionButtonLabel}>{label}</span>
		</button>
	)
}
