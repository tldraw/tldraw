import {
	CommentsMenuItem,
	richTextToPlaintext,
	toggleCommentsSidebar,
	useCommentsSidebarOpen,
} from '@tldraw/commenting'
import { useNavigate } from 'react-router-dom'
import {
	CommandPaletteActionGroup,
	CommandPaletteArrangeGroup,
	CommandPaletteCollapsed,
	CommandPalettePinned,
	CommandPaletteEditGroup,
	CommandPaletteExportGroup,
	CommandPaletteHelpGroup,
	CommandPaletteImageGroup,
	CommandPalettePagesGroup,
	CommandPalettePreferencesGroup,
	CommandPaletteSelectionGroup,
	CommandPaletteStylesGroup,
	CommandPalettePromptItem,
	CommandPaletteToolsGroup,
	CommandPaletteViewGroup,
	DefaultCommandPalette,
	TldrawUiMenuActionItem,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TLRichText,
	TldrawUiMenuSubmenu,
	defineMessages,
	getCommandPaletteMatchScore,
	useCommandPaletteQuery,
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
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
	UIThemeCommandPaletteSubmenu,
} from '../menu-items/menu-items'
import { FileItems } from '../TlaFileMenu/TlaFileMenu'
import { openShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { useHandleSidebarCreateFile } from '../TlaSidebar/components/TlaSidebarCreateFileButton'
import { openNotificationsPanel } from '../TlaSidebar/components/TlaSidebarNotificationsButton'
import {
	commentLink,
	useCommentNotifications,
} from '../TlaSidebar/components/TlaSidebarNotificationsPanel'
import {
	useCreateWorkspaceDialog,
	useSwitchToWorkspace,
} from '../TlaSidebar/components/TlaSidebarWorkspaceSwitcher'
import notificationStyles from '../TlaSidebar/components/notifications.module.css'

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
	openNotifications: { defaultMessage: 'Open notifications panel' },
	unknownAuthor: { defaultMessage: 'Someone' },
	markAllRead: { defaultMessage: 'Mark all notifications as read' },
	workspaces: { defaultMessage: 'Workspaces' },
	switchWorkspace: { defaultMessage: 'Switch workspace' },
	myWorkspace: { defaultMessage: 'My workspace' },
	newWorkspace: { defaultMessage: 'New workspace…' },
	workspaceSettings: { defaultMessage: 'Workspace settings…' },
	copyInviteLink: { defaultMessage: 'Copy invite link' },
	account: { defaultMessage: 'Account' },
	signIn: { defaultMessage: 'Sign in' },
})

export function TlaCommandPalette() {
	const app = useMaybeApp()
	return (
		<DefaultCommandPalette>
			{app && <TlaNotificationsGroup />}
			<CommandPaletteSelectionGroup />
			<CommandPaletteArrangeGroup />
			<CommandPaletteImageGroup />
			<CommandPaletteStylesGroup />
			{app && <TlaFilesGroup />}
			{app && <TlaCurrentFileGroup />}
			<CommandPalettePagesGroup />
			{app && <TlaShareGroup />}
			<TlaAppGroup />
			<CommandPaletteEditGroup />
			<CommandPaletteViewGroup />
			<CommandPaletteExportGroup />
			<CommandPaletteToolsGroup />
			{app && <TlaWorkspacesGroup />}
			<CommandPalettePreferencesGroup />
			<TlaAccountGroup />
			<CommandPaletteHelpGroup />
			<CommandPaletteActionGroup />
		</DefaultCommandPalette>
	)
}

function TlaFilesGroup() {
	const msg = useTranslation()
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const query = useCommandPaletteQuery()
	const currentFileId = useCurrentFileId()
	const filesLbl = msg(messages.files)
	const goToFileLbl = msg(messages.goToFile)
	const myWorkspaceLbl = msg(messages.myWorkspace)

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
	const msg = useTranslation()
	const app = useApp()
	const fileId = useCurrentFileId()
	const activeWorkspaceId = useActiveWorkspaceId()
	const createFile = useHandleSidebarCreateFile()
	const currentFileLbl = msg(messages.currentFile)
	const newFileLbl = msg(messages.newFile)
	const fileNamePlaceholder = msg(messages.fileNamePlaceholder)
	const hasFile = useValue('has file', () => !!app.getFile(fileId), [app, fileId])

	return (
		<TldrawUiMenuGroup id="tla-current-file" label={currentFileLbl}>
			<CommandPalettePromptItem
				id="tla-new-file"
				label={newFileLbl}
				placeholder={fileNamePlaceholder}
				onSubmit={(name) => createFile({ name, source: 'command-palette' })}
			/>
			{fileId && hasFile && (
				<FileItems
					source="command-palette"
					fileId={fileId}
					workspaceId={activeWorkspaceId}
					idPrefix="file-"
				/>
			)}
			<ImportFileActionItem source="command-palette" />
		</TldrawUiMenuGroup>
	)
}

function TlaShareGroup() {
	const msg = useTranslation()
	const app = useApp()
	const editor = useEditor()
	const { addToast } = useToasts()
	const trackEvent = useTldrawAppUiEvents()
	const fileId = useCurrentFileId()
	const isAdmin = useHasFileAdminRights(fileId)
	const commentingEnabled = useIsCommentingEnabled()
	const commentsSidebarOpen = useCommentsSidebarOpen()
	const file = useValue('file', () => app.getFile(fileId), [app, fileId])
	const shareLbl = msg(messages.share)
	const shareFileLbl = msg(messages.shareFile)
	const publishLbl = msg(messages.publish)
	const unpublishLbl = msg(messages.unpublish)
	const copyPublishedLbl = msg(messages.copyPublishedLink)
	const copiedLbl = msg(messages.copied)
	const commentsSidebarLbl = msg(messages.commentsSidebar)

	if (!fileId || !file) return null

	return (
		<TldrawUiMenuGroup id="tla-share" label={shareLbl}>
			<TldrawUiMenuItem
				id="tla-share-file"
				label={shareFileLbl}
				readonlyOk
				onSelect={() => {
					openShareMenu(editor, fileId)
					trackEvent('open-share-menu', { source: 'command-palette' })
				}}
			/>
			{isAdmin && (
				<TldrawUiMenuItem
					id="tla-publish"
					label={file.published ? unpublishLbl : publishLbl}
					onSelect={() => {
						if (file.published) {
							app.unpublishFile(fileId)
							trackEvent('unpublish-file', { source: 'command-palette' })
						} else {
							app.publishFile(fileId)
							trackEvent('publish-file', { source: 'command-palette' })
						}
					}}
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
						trackEvent('copy-publish-link', { source: 'command-palette' })
					}}
				/>
			)}
			{commentingEnabled && <CommentsMenuItem />}
			{commentingEnabled && (
				<TldrawUiMenuItem
					id="tla-comments-sidebar"
					label={commentsSidebarLbl}
					readonlyOk
					onSelect={() => {
						toggleCommentsSidebar(editor)
						trackEvent('toggle-comments-sidebar', {
							source: 'command-palette',
							open: !commentsSidebarOpen,
						})
					}}
				/>
			)}
		</TldrawUiMenuGroup>
	)
}

const MAX_NOTIFICATIONS = 20

// Pinned under the feature flags while anything is unread, as one row that opens to the
// notifications, newest first, with the unread ones marked like in the sidebar.
function TlaNotificationsGroup() {
	const msg = useTranslation()
	const app = useApp()
	const navigate = useNavigate()
	const { notifications, unreadCount } = useCommentNotifications()
	const notificationsLbl = msg(messages.notifications)
	const unknownAuthorLbl = msg(messages.unknownAuthor)
	if (!unreadCount) return null
	// A comment can be notified about twice (the comment and reactions to it); list it once.
	const seen = new Set<string>()
	const listed = notifications
		.filter((n) => !seen.has(n.comment.id) && seen.add(n.comment.id))
		.slice(0, MAX_NOTIFICATIONS)
	const unreadIcon = <span className={notificationStyles.paletteUnreadIcon} />

	return (
		<CommandPalettePinned>
			<CommandPaletteCollapsed>
				<TldrawUiMenuSubmenu id="tla-new-notifications" label={notificationsLbl} icon={unreadIcon}>
					{listed.map(({ comment, unread }) => (
						<TldrawUiMenuItem
							key={comment.id}
							id={`notification:${comment.id}`}
							iconLeft={unread ? unreadIcon : undefined}
							label={`${comment.authorName || unknownAuthorLbl}: ${richTextToPlaintext(comment.body as TLRichText)}`}
							readonlyOk
							onSelect={() => {
								if (unread) app.markCommentRead(comment.id)
								navigate(commentLink(comment.fileId, comment.thread?.shapeId, comment.id))
							}}
						/>
					))}
				</TldrawUiMenuSubmenu>
			</CommandPaletteCollapsed>
		</CommandPalettePinned>
	)
}

function TlaAppGroup() {
	const msg = useTranslation()
	const app = useMaybeApp()
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()
	const appLbl = msg(messages.app)
	const toggleSidebarLbl = msg(messages.toggleSidebar)
	const openNotificationsLbl = msg(messages.openNotifications)

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
					label={openNotificationsLbl}
					readonlyOk
					onSelect={() => openNotificationsPanel(editor)}
				/>
			)}
			{app && <TlaMarkAllReadItem />}
			<GiveUsFeedbackMenuItem />
			<UserManualMenuItem icon={false} source="command-palette" />
		</TldrawUiMenuGroup>
	)
}

function TlaMarkAllReadItem() {
	const msg = useTranslation()
	const app = useApp()
	const { notifications, unreadCount } = useCommentNotifications()
	const markAllReadLbl = msg(messages.markAllRead)
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
	const msg = useTranslation()
	const app = useApp()
	const { addDialog } = useDialogs()
	const activeWorkspaceId = useActiveWorkspaceId()
	const switchToWorkspace = useSwitchToWorkspace()
	const createWorkspace = useCreateWorkspaceDialog('command-palette')
	const memberships = useValue('memberships', () => app.getWorkspaceMemberships(), [app])
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const activeMembership = memberships.find((m) => m.groupId === activeWorkspaceId)
	const workspacesLbl = msg(messages.workspaces)
	const switchLbl = msg(messages.switchWorkspace)
	const myWorkspaceLbl = msg(messages.myWorkspace)
	const newWorkspaceLbl = msg(messages.newWorkspace)
	const settingsLbl = msg(messages.workspaceSettings)
	const copyInviteLbl = msg(messages.copyInviteLink)
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
	const msg = useTranslation()
	const app = useMaybeApp()
	const { addDialog } = useDialogs()
	const accountLbl = msg(messages.account)
	const signInLbl = msg(messages.signIn)

	return (
		<TldrawUiMenuGroup id="tla-account" label={accountLbl}>
			<UIThemeCommandPaletteSubmenu />
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
			<SignOutMenuItem source="command-palette" />
		</TldrawUiMenuGroup>
	)
}
