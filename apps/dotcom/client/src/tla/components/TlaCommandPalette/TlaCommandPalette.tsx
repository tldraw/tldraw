import { CommentsMenuItem, toggleCommentsSidebar } from '@tldraw/commenting'
import { useNavigate } from 'react-router-dom'
import {
	CommandPaletteActionGroup,
	CommandPaletteArrangeGroup,
	CommandPaletteEditGroup,
	CommandPaletteExportGroup,
	CommandPaletteHelpGroup,
	CommandPalettePagesGroup,
	CommandPalettePreferencesGroup,
	CommandPaletteSelectionGroup,
	CommandPalettePromptItem,
	CommandPaletteViewGroup,
	DefaultCommandPalette,
	TldrawUiMenuActionItem,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	commandPaletteFlags,
	getCommandPaletteMatchScore,
	useCommandPaletteQuery,
	useDialogs,
	useEditor,
	useToasts,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { getFileVisitDate } from '../../app/TldrawApp'
import { useActiveWorkspaceId } from '../../hooks/useActiveWorkspaceId'
import { useApp, useMaybeApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useIsCommentingEnabled } from '../../hooks/useIsCommentingEnabled'
import { useHasFileAdminRights } from '../../hooks/useIsFileOwner'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { copyTextToClipboard } from '../../utils/copy'
import { defineMessages, useMsg } from '../../utils/i18n'
import {
	getIsSidebarOpen,
	isDesktopSidebarLayout,
	toggleMobileSidebar,
	toggleSidebar,
} from '../../utils/local-session-state'
import { TlaSignInDialog } from '../dialogs/TlaSignInDialog'
import { WorkspaceSettingsDialog } from '../dialogs/WorkspaceSettingsDialog'
import {
	GiveUsFeedbackMenuItem,
	ImportFileActionItem,
	SignOutMenuItem,
	UserManualMenuItem,
	useUIThemeChoices,
} from '../menu-items/menu-items'
import { useStartFileRename } from '../TlaEditor/fileHeaderRename'
import { FileItems } from '../TlaFileMenu/TlaFileMenu'
import { openShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { useHandleSidebarCreateFile } from '../TlaSidebar/components/TlaSidebarCreateFileButton'
import { openNotificationsPanel } from '../TlaSidebar/components/TlaSidebarNotificationsButton'
import { useCommentNotifications } from '../TlaSidebar/components/TlaSidebarNotificationsPanel'
import {
	useCreateWorkspaceDialog,
	useSwitchToWorkspace,
} from '../TlaSidebar/components/TlaSidebarWorkspaceSwitcher'

const MAX_FILE_RESULTS = 8
const MAX_RECENT_FILES = 5

const messages = defineMessages({
	files: { defaultMessage: 'Files' },
	goToFile: { defaultMessage: 'Go to file' },
	currentFile: { defaultMessage: 'Current file' },
	newFile: { defaultMessage: 'New file' },
	fileNamePlaceholder: { defaultMessage: 'File name' },
	share: { defaultMessage: 'Share' },
	shareFile: { defaultMessage: 'Share…' },
	publish: { defaultMessage: 'Publish file' },
	unpublish: { defaultMessage: 'Unpublish file' },
	copyPublishedLink: { defaultMessage: 'Copy published link' },
	copied: { defaultMessage: 'Copied link' },
	commentsSidebar: { defaultMessage: 'Toggle comments sidebar' },
	app: { defaultMessage: 'App' },
	toggleSidebar: { defaultMessage: 'Toggle sidebar' },
	notifications: { defaultMessage: 'Notifications' },
	markAllRead: { defaultMessage: 'Mark all notifications as read' },
	workspaces: { defaultMessage: 'Workspaces' },
	switchWorkspace: { defaultMessage: 'Switch workspace' },
	myWorkspace: { defaultMessage: 'My workspace' },
	newWorkspace: { defaultMessage: 'New workspace…' },
	workspaceSettings: { defaultMessage: 'Workspace settings…' },
	copyInviteLink: { defaultMessage: 'Copy invite link' },
	account: { defaultMessage: 'Account' },
	colorTheme: { defaultMessage: 'Color theme' },
	signIn: { defaultMessage: 'Sign in' },
})

export function TlaCommandPalette() {
	const app = useMaybeApp()
	return (
		<DefaultCommandPalette>
			<CommandPaletteSelectionGroup />
			<CommandPaletteArrangeGroup />
			{app && <TlaFilesGroup />}
			{app && <TlaCurrentFileGroup />}
			<CommandPalettePagesGroup />
			{app && <TlaShareGroup />}
			<TlaAppGroup />
			<CommandPaletteEditGroup />
			<CommandPaletteViewGroup />
			<CommandPaletteExportGroup />
			{app && <TlaWorkspacesGroup />}
			<CommandPalettePreferencesGroup />
			<TlaAccountGroup />
			<CommandPaletteHelpGroup />
			<CommandPaletteActionGroup />
		</DefaultCommandPalette>
	)
}

function TlaFilesGroup() {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const query = useCommandPaletteQuery()
	const currentFileId = useCurrentFileId()
	const filesLbl = useMsg(messages.files)
	const goToFileLbl = useMsg(messages.goToFile)
	const myWorkspaceLbl = useMsg(messages.myWorkspace)

	const results = useValue(
		'command palette files',
		() => {
			const workspaceName = (workspaceId: string) =>
				app.getWorkspaceMembership(workspaceId)?.group?.name?.trim() || myWorkspaceLbl
			const searchable = app.getSearchableFiles().filter((file) => file.fileId !== currentFileId)
			const entries = (files: typeof searchable) =>
				files.map((file) => {
					const name = app.getFileName(file.fileId)
					const workspace = workspaceName(file.workspaceId)
					// Same prefixed label and path the palette ranks by, so a query it would match isn't
					// filtered out here.
					const label = `${goToFileLbl}: ${name}`
					return {
						...file,
						name,
						workspace,
						score: getCommandPaletteMatchScore(query, label, [filesLbl, workspace]),
					}
				})
			if (!query.trim()) {
				// Empty query lists recent files: Recent can only show files that are rendered as items.
				const searchableById = new Map(searchable.map((file) => [file.fileId, file]))
				return app
					.getUserFileStates()
					.flatMap((state) => {
						const file = searchableById.get(state.fileId)
						const date = getFileVisitDate(state)
						return file && date !== undefined ? [{ file, date }] : []
					})
					.sort((a, b) => b.date - a.date)
					.slice(0, MAX_RECENT_FILES)
					.flatMap(({ file }) => entries([file]))
			}
			return entries(searchable)
				.filter((file) => file.score > 0)
				.sort((a, b) => b.score - a.score)
				.slice(0, MAX_FILE_RESULTS)
		},
		[app, query, myWorkspaceLbl, currentFileId, filesLbl, goToFileLbl]
	)

	if (results.length === 0) return null

	return (
		<TldrawUiMenuGroup id="tla-files" label={filesLbl}>
			<TldrawUiMenuSubmenu id="tla-go-to-file" label={goToFileLbl}>
				{/* One group per file keeps results in order while putting the workspace in its search path. */}
				{results.map((file) => (
					<TldrawUiMenuGroup
						key={file.fileId}
						id={`tla-file-${file.fileId}`}
						label={file.workspace}
					>
						<TldrawUiMenuItem
							id={`file:${file.fileId}`}
							label={file.name}
							readonlyOk
							onSelect={() => {
								trackEvent('click-file-link', { source: 'command-palette' })
								navigate(routes.tlaFile(file.fileId))
							}}
						/>
					</TldrawUiMenuGroup>
				))}
			</TldrawUiMenuSubmenu>
		</TldrawUiMenuGroup>
	)
}

function TlaCurrentFileGroup() {
	const app = useApp()
	const fileId = useCurrentFileId()
	const activeWorkspaceId = useActiveWorkspaceId()
	const createFile = useHandleSidebarCreateFile()
	const currentFileLbl = useMsg(messages.currentFile)
	const newFileLbl = useMsg(messages.newFile)
	const fileNamePlaceholder = useMsg(messages.fileNamePlaceholder)
	const nameNewFiles = useValue(commandPaletteFlags.nameNewFiles)
	const fileName = useValue('file name', () => app.getFileName(fileId ?? null), [app, fileId])
	const startRename = useStartFileRename(fileId, fileName)
	const hasFile = useValue('has file', () => !!app.getFile(fileId), [app, fileId])

	return (
		<TldrawUiMenuGroup id="tla-current-file" label={currentFileLbl}>
			{nameNewFiles ? (
				<CommandPalettePromptItem
					id="tla-new-file"
					label={newFileLbl}
					placeholder={fileNamePlaceholder}
					onSubmit={(name) => createFile({ name })}
				/>
			) : (
				<TldrawUiMenuItem
					id="tla-new-file"
					label={newFileLbl}
					readonlyOk
					onSelect={() => createFile()}
				/>
			)}
			{fileId && hasFile && (
				<FileItems
					source="command-palette"
					fileId={fileId}
					workspaceId={activeWorkspaceId}
					onRenameAction={startRename}
					idPrefix="file-"
				/>
			)}
			<ImportFileActionItem />
		</TldrawUiMenuGroup>
	)
}

function TlaShareGroup() {
	const app = useApp()
	const editor = useEditor()
	const { addToast } = useToasts()
	const fileId = useCurrentFileId()
	const isAdmin = useHasFileAdminRights(fileId)
	const commentingEnabled = useIsCommentingEnabled()
	const file = useValue('file', () => app.getFile(fileId), [app, fileId])
	const shareLbl = useMsg(messages.share)
	const shareFileLbl = useMsg(messages.shareFile)
	const publishLbl = useMsg(messages.publish)
	const unpublishLbl = useMsg(messages.unpublish)
	const copyPublishedLbl = useMsg(messages.copyPublishedLink)
	const copiedLbl = useMsg(messages.copied)
	const commentsSidebarLbl = useMsg(messages.commentsSidebar)

	if (!fileId || !file) return null

	return (
		<TldrawUiMenuGroup id="tla-share" label={shareLbl}>
			<TldrawUiMenuItem
				id="tla-share-file"
				label={shareFileLbl}
				readonlyOk
				onSelect={() => openShareMenu(editor, fileId)}
			/>
			{isAdmin && (
				<TldrawUiMenuItem
					id="tla-publish"
					label={file.published ? unpublishLbl : publishLbl}
					onSelect={() => (file.published ? app.unpublishFile(fileId) : app.publishFile(fileId))}
				/>
			)}
			{file.published && file.publishedSlug && (
				<TldrawUiMenuItem
					id="tla-copy-published-link"
					label={copyPublishedLbl}
					readonlyOk
					onSelect={() => {
						copyTextToClipboard(routes.tlaPublish(file.publishedSlug!, { asUrl: true }))
						addToast({ id: 'copied-published-link', title: copiedLbl })
					}}
				/>
			)}
			{commentingEnabled && <CommentsMenuItem />}
			{commentingEnabled && (
				<TldrawUiMenuItem
					id="tla-comments-sidebar"
					label={commentsSidebarLbl}
					readonlyOk
					onSelect={() => toggleCommentsSidebar(editor)}
				/>
			)}
		</TldrawUiMenuGroup>
	)
}

function TlaAppGroup() {
	const app = useMaybeApp()
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()
	const appLbl = useMsg(messages.app)
	const toggleSidebarLbl = useMsg(messages.toggleSidebar)
	const notificationsLbl = useMsg(messages.notifications)

	return (
		<TldrawUiMenuGroup id="tla-app" label={appLbl}>
			{app && (
				<TldrawUiMenuItem
					id="tla-toggle-sidebar"
					label={toggleSidebarLbl}
					kbd="cmd+\,ctrl+\"
					readonlyOk
					onSelect={() => {
						if (isDesktopSidebarLayout()) toggleSidebar()
						else toggleMobileSidebar()
						trackEvent('sidebar-toggle', { value: getIsSidebarOpen(), source: 'command-palette' })
					}}
				/>
			)}
			{app && (
				<TldrawUiMenuItem
					id="tla-notifications"
					label={notificationsLbl}
					readonlyOk
					onSelect={() => openNotificationsPanel(editor)}
				/>
			)}
			{app && <TlaMarkAllReadItem />}
			<GiveUsFeedbackMenuItem />
			<UserManualMenuItem icon={false} />
		</TldrawUiMenuGroup>
	)
}

function TlaMarkAllReadItem() {
	const app = useApp()
	const { notifications, unreadCount } = useCommentNotifications()
	const markAllReadLbl = useMsg(messages.markAllRead)
	if (unreadCount === 0) return null
	return (
		<TldrawUiMenuItem
			id="tla-mark-all-read"
			label={markAllReadLbl}
			readonlyOk
			onSelect={() =>
				app.markCommentsRead(notifications.filter((n) => n.unread).map((n) => n.comment.id))
			}
		/>
	)
}

function TlaWorkspacesGroup() {
	const app = useApp()
	const { addDialog } = useDialogs()
	const activeWorkspaceId = useActiveWorkspaceId()
	const switchToWorkspace = useSwitchToWorkspace()
	const createWorkspace = useCreateWorkspaceDialog('command-palette')
	const memberships = useValue('memberships', () => app.getWorkspaceMemberships(), [app])
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const activeMembership = memberships.find((m) => m.groupId === activeWorkspaceId)
	const workspacesLbl = useMsg(messages.workspaces)
	const switchLbl = useMsg(messages.switchWorkspace)
	const myWorkspaceLbl = useMsg(messages.myWorkspace)
	const newWorkspaceLbl = useMsg(messages.newWorkspace)
	const settingsLbl = useMsg(messages.workspaceSettings)
	const copyInviteLbl = useMsg(messages.copyInviteLink)
	const canCopyInvite =
		activeWorkspaceId !== homeWorkspaceId && (activeMembership?.group?.inviteLinkEnabled ?? true)

	return (
		<TldrawUiMenuGroup id="tla-workspaces" label={workspacesLbl}>
			<TldrawUiMenuSubmenu id="tla-switch-workspace" label={switchLbl}>
				{memberships
					.filter((membership) => membership.groupId !== activeWorkspaceId)
					.map((membership) => (
						<TldrawUiMenuItem
							key={membership.groupId}
							id={`workspace:${membership.groupId}`}
							label={membership.group?.name?.trim() || myWorkspaceLbl}
							readonlyOk
							onSelect={() => switchToWorkspace(membership.groupId)}
						/>
					))}
			</TldrawUiMenuSubmenu>
			<TldrawUiMenuItem
				id="tla-new-workspace"
				label={newWorkspaceLbl}
				readonlyOk
				onSelect={createWorkspace}
			/>
			<TldrawUiMenuItem
				id="tla-workspace-settings"
				label={settingsLbl}
				readonlyOk
				onSelect={() => {
					addDialog({
						component: ({ onClose }) => (
							<WorkspaceSettingsDialog workspaceId={activeWorkspaceId} onClose={onClose} />
						),
					})
				}}
			/>
			{canCopyInvite && (
				<TldrawUiMenuItem
					id="tla-copy-invite-link"
					label={copyInviteLbl}
					readonlyOk
					onSelect={() => {
						app.copyWorkspaceInvite(activeWorkspaceId)
					}}
				/>
			)}
		</TldrawUiMenuGroup>
	)
}

function TlaAccountGroup() {
	const app = useMaybeApp()
	const { addDialog } = useDialogs()
	const themeChoices = useUIThemeChoices()
	const accountLbl = useMsg(messages.account)
	const colorThemeLbl = useMsg(messages.colorTheme)
	const signInLbl = useMsg(messages.signIn)

	return (
		<TldrawUiMenuGroup id="tla-account" label={accountLbl}>
			{themeChoices.length > 0 && (
				<TldrawUiMenuSubmenu id="tla-color-theme" label={colorThemeLbl}>
					{themeChoices.map((choice) => (
						<TldrawUiMenuCheckboxItem
							key={choice.id}
							id={`ui-theme-${choice.id}`}
							label={choice.label}
							checked={choice.checked}
							readonlyOk
							onSelect={() => choice.select('command-palette')}
						/>
					))}
				</TldrawUiMenuSubmenu>
			)}
			{!app && (
				<TldrawUiMenuItem
					id="tla-sign-in"
					label={signInLbl}
					readonlyOk
					onSelect={() => {
						addDialog({ component: TlaSignInDialog })
					}}
				/>
			)}
			{!app && <TldrawUiMenuActionItem actionId="save-file-copy" />}
			<SignOutMenuItem />
		</TldrawUiMenuGroup>
	)
}
