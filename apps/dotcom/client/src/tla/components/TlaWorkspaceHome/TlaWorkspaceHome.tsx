import { formatRelativeTime } from '@tldraw/commenting'
import classNames from 'classnames'
import { ReactNode, useCallback, useState } from 'react'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import {
	defineMessages,
	F,
	getFromLocalStorage,
	setInLocalStorage,
	TldrawUiButton,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiIcon,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDialogs,
	useTranslation,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { getFileRecencyDate } from '../../app/TldrawApp'
import { useApp } from '../../hooks/useAppState'
import { useWorkspaceName } from '../../hooks/useWorkspaceName'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { WorkspaceSettingsDialog } from '../dialogs/WorkspaceSettingsDialog'
import { TLA_MENU_POSITION } from '../tla-menu/tla-menu'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { useHandleSidebarCreateFile } from '../TlaSidebar/components/TlaSidebarCreateFileButton'
import { sidebarMessages } from '../TlaSidebar/components/TlaSidebarFileLink'
import styles from './workspace-home.module.css'

const messages = defineMessages({
	newBoard: { defaultMessage: 'New board' },
	workspaceMenu: { defaultMessage: 'Workspace menu' },
	manage: { defaultMessage: 'Manage' },
	boardMenu: { defaultMessage: 'Board menu' },
	listView: { defaultMessage: 'List view' },
	gridView: { defaultMessage: 'Grid view' },
})

type Tab = 'recent' | 'archive' | 'shared'
type ViewMode = 'grid' | 'list'

const VIEW_MODE_KEY = 'tla-workspace-home-view-mode'

interface BoardItem {
	fileId: string
	name: string
	date: number
	/** Set for boards owned by someone outside this workspace. */
	ownerName?: string
}

export function TlaWorkspaceHome({ workspaceId }: { workspaceId: string }) {
	const [tab, setTab] = useState<Tab>('recent')
	const [viewMode, setViewMode] = useState<ViewMode>(() =>
		getFromLocalStorage(VIEW_MODE_KEY) === 'list' ? 'list' : 'grid'
	)
	const handleViewModeChange = useCallback((mode: ViewMode) => {
		setViewMode(mode)
		setInLocalStorage(VIEW_MODE_KEY, mode)
	}, [])

	const boards = useWorkspaceBoards(workspaceId, tab)

	return (
		<div className={styles.home} data-testid="tla-workspace-home">
			<TlaWorkspaceHomeHeader workspaceId={workspaceId} />
			<div className={styles.navigation}>
				<div className={styles.tabs} role="tablist">
					<TlaWorkspaceHomeTab tab="recent" current={tab} onSelect={setTab}>
						<F defaultMessage="Recently viewed" />
					</TlaWorkspaceHomeTab>
					<TlaWorkspaceHomeTab tab="archive" current={tab} onSelect={setTab}>
						<F defaultMessage="Archive" />
					</TlaWorkspaceHomeTab>
					<TlaWorkspaceHomeTab tab="shared" current={tab} onSelect={setTab}>
						<F defaultMessage="Shared with me" />
					</TlaWorkspaceHomeTab>
				</div>
				<TlaViewModeToggle viewMode={viewMode} onChange={handleViewModeChange} />
			</div>
			{boards.length === 0 ? (
				<div className={classNames(styles.empty, 'tla-text_ui__regular')}>
					{tab === 'archive' ? (
						<F defaultMessage="Archived boards will appear here." />
					) : (
						<F defaultMessage="No boards here yet." />
					)}
				</div>
			) : (
				<div
					className={viewMode === 'grid' ? styles.grid : styles.list}
					data-testid="tla-workspace-boards"
				>
					{boards.map((board) => (
						<TlaBoardCard
							key={board.fileId}
							board={board}
							workspaceId={workspaceId}
							viewMode={viewMode}
						/>
					))}
				</div>
			)}
		</div>
	)
}

function useWorkspaceBoards(workspaceId: string, tab: Tab): BoardItem[] {
	const app = useApp()
	return useValue(
		'workspace boards',
		() => {
			// TODO: files have no archived state yet.
			if (tab === 'archive') return []

			const query = app.sidebarState.get().searchQuery.trim().toLowerCase()
			const boards: BoardItem[] = []
			for (const { fileId } of app.getWorkspaceFilesSorted(workspaceId)) {
				const file = app.getFile(fileId)
				if (!file) continue
				const name = app.getFileName(file)
				if (query && !name.toLowerCase().includes(query)) continue
				// Owned by a workspace the user isn't in: a shared board they opened as a guest.
				const isShared = !!file.owningGroupId && !app.getWorkspaceMembership(file.owningGroupId)
				if (tab === 'shared' && !isShared) continue
				boards.push({
					fileId,
					name,
					date: getFileRecencyDate(app.getFileState(fileId), file),
					ownerName: isShared ? file.ownerName : undefined,
				})
			}
			return boards.sort((a, b) => b.date - a.date)
		},
		[app, workspaceId, tab]
	)
}

function TlaWorkspaceHomeHeader({ workspaceId }: { workspaceId: string }) {
	const msg = useTranslation()
	const name = useWorkspaceName(workspaceId)
	const handleCreateFile = useHandleSidebarCreateFile()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const menuLbl = msg(messages.workspaceMenu)

	const handleManage = useCallback(() => {
		addDialog({
			component: ({ onClose }) => (
				<WorkspaceSettingsDialog workspaceId={workspaceId} onClose={onClose} />
			),
		})
		trackEvent('open-share-menu', { source: 'workspace-home' })
	}, [addDialog, workspaceId, trackEvent])

	return (
		<div className={styles.header}>
			<h1 className={classNames(styles.title, 'notranslate')} data-testid="tla-workspace-title">
				{name}
			</h1>
			<TldrawUiDropdownMenuRoot id={`workspace-menu-${workspaceId}`}>
				<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
					<TldrawUiDropdownMenuTrigger>
						<TldrawUiButton
							type="icon"
							className={styles.headerMenuTrigger}
							tooltip={menuLbl}
							title={menuLbl}
						>
							<TlaIcon icon="dots-vertical-strong" />
						</TldrawUiButton>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent side="bottom" align="start" {...TLA_MENU_POSITION}>
						<TldrawUiMenuGroup id="workspace">
							<TldrawUiMenuItem
								id="manage-workspace"
								label={msg(messages.manage)}
								readonlyOk
								onSelect={handleManage}
							/>
						</TldrawUiMenuGroup>
					</TldrawUiDropdownMenuContent>
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuRoot>
			<div className={styles.spacer} />
			<TlaButton icon="plus" onClick={handleCreateFile} data-testid="tla-workspace-new-board">
				{msg(messages.newBoard)}
			</TlaButton>
		</div>
	)
}

function TlaWorkspaceHomeTab({
	tab,
	current,
	onSelect,
	children,
}: {
	tab: Tab
	current: Tab
	onSelect(tab: Tab): void
	children: ReactNode
}) {
	return (
		<button
			role="tab"
			aria-selected={tab === current}
			className={classNames(styles.tab, 'tla-text_ui__regular')}
			onClick={() => onSelect(tab)}
			data-testid={`tla-workspace-tab-${tab}`}
		>
			{children}
		</button>
	)
}

function TlaViewModeToggle({
	viewMode,
	onChange,
}: {
	viewMode: ViewMode
	onChange(mode: ViewMode): void
}) {
	const msg = useTranslation()
	return (
		<div className={styles.viewToggle}>
			<button
				className={styles.viewToggleButton}
				aria-pressed={viewMode === 'list'}
				title={msg(messages.listView)}
				onClick={() => onChange('list')}
			>
				<TldrawUiIcon icon="list" label={msg(messages.listView)} small />
			</button>
			<button
				className={styles.viewToggleButton}
				aria-pressed={viewMode === 'grid'}
				title={msg(messages.gridView)}
				onClick={() => onChange('grid')}
			>
				<TlaIcon icon="layout-grid" />
			</button>
		</div>
	)
}

function TlaBoardCard({
	board,
	workspaceId,
	viewMode,
}: {
	board: BoardItem
	workspaceId: string
	viewMode: ViewMode
}) {
	const app = useApp()
	const msg = useTranslation()
	const intl = useIntl()
	const menuLbl = msg(messages.boardMenu)

	const handleRename = useCallback(() => {
		const name = prompt(intl.formatMessage(sidebarMessages.renameFile), board.name)?.trim()
		if (name) app.updateFile(board.fileId, { name })
	}, [app, intl, board.fileId, board.name])

	const time = formatRelativeTime(new Date(board.date).toISOString(), intl.locale)

	return (
		<div className={viewMode === 'grid' ? styles.card : styles.row} data-testid="tla-board-card">
			<Link to={routes.tlaFile(board.fileId)} className={styles.cardLink} aria-label={board.name} />
			{viewMode === 'grid' && <TlaBoardThumbnail fileId={board.fileId} />}
			<div className={styles.cardFooter}>
				<div className={styles.cardText}>
					<div className={classNames(styles.cardName, 'notranslate')}>{board.name}</div>
					<div className={styles.cardMeta}>
						{board.ownerName ? `${board.ownerName} • ${time}` : time}
					</div>
				</div>
				<TlaFileMenu
					fileId={board.fileId}
					workspaceId={workspaceId}
					source="workspace-home"
					onRenameAction={handleRename}
					trigger={
						<TldrawUiButton
							type="icon"
							className={styles.cardMenuTrigger}
							tooltip={menuLbl}
							title={menuLbl}
						>
							<TlaIcon icon="dots-vertical-strong" />
						</TldrawUiButton>
					}
				/>
			</div>
		</div>
	)
}

function TlaBoardThumbnail({ fileId }: { fileId: string }) {
	// A board nobody has edited since thumbnails shipped has none yet; the endpoint 404s.
	const [failed, setFailed] = useState(false)
	return (
		<div className={styles.cardPreview}>
			{!failed && (
				<img
					className={styles.cardPreviewImage}
					src={`/api/app/file/${fileId}/thumbnail`}
					alt=""
					loading="lazy"
					draggable={false}
					onError={() => setFailed(true)}
				/>
			)}
		</div>
	)
}
