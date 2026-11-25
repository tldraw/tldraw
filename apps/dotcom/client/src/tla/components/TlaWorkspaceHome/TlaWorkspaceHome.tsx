import { formatRelativeTime } from '@tldraw/commenting'
import classNames from 'classnames'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import { MouseEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { Link, useNavigate } from 'react-router-dom'
import {
	defineMessages,
	F,
	getFromLocalStorage,
	setInLocalStorage,
	TldrawUiButton,
	TldrawUiIcon,
	TldrawUiMenuContextProvider,
	useContainer,
	useMenuIsOpen,
	useTranslation,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { getFileRecencyDate } from '../../app/TldrawApp'
import { useApp } from '../../hooks/useAppState'
import { BoardPresenceProvider, useBoardPresence } from '../../hooks/useBoardPresence'
import { useHasFileAdminRights } from '../../hooks/useIsFileOwner'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { useDesignSwitch } from '../../utils/designSwitches'
import { getIsCoarsePointer } from '../../utils/getIsCoarsePointer'
import { TlaButton } from '../TlaButton/TlaButton'
import { FileItems, TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import {
	messages as sidebarMessages,
	useHandleSidebarCreateFile,
} from '../TlaSidebar/components/sidebar-shared'
import { TlaSidebarRenameInline } from '../TlaSidebar/components/TlaSidebarRenameInline'
import { TlaBoardVisitors } from './TlaBoardVisitors'
import styles from './workspace-home.module.css'

const messages = defineMessages({
	newFile: { defaultMessage: 'New file' },
	search: { defaultMessage: 'Search…' },
	clearSearch: { defaultMessage: 'Clear search' },
	listView: { defaultMessage: 'List view' },
	gridView: { defaultMessage: 'Grid view' },
	edited: { defaultMessage: 'Edited {time}' },
	pinned: { defaultMessage: 'Pinned' },
})

type Tab = 'recent' | 'mine' | 'shared' | 'archive'
type ViewMode = 'grid' | 'list'

const VIEW_MODE_KEY = 'tla-workspace-home-view-mode'

interface BoardItem {
	fileId: string
	name: string
	date: number
	isPinned: boolean
	/** Set for boards shared with the user by someone else. */
	ownerName?: string
}

export function TlaWorkspaceHome({ workspaceId }: { workspaceId: string }) {
	const app = useApp()
	const [selectedTab, setTab] = useState<Tab>('recent')
	// Only the home workspace lists boards from other workspaces; a team workspace lists only its own.
	const showSharedTab = workspaceId === app.getHomeWorkspaceId()
	const tab = selectedTab === 'shared' && !showSharedTab ? 'recent' : selectedTab
	const [query, setQuery] = useState('')
	const [viewMode, setViewMode] = useState<ViewMode>(() =>
		getFromLocalStorage(VIEW_MODE_KEY) === 'list' ? 'list' : 'grid'
	)
	const handleViewModeChange = useCallback((mode: ViewMode) => {
		setViewMode(mode)
		setInLocalStorage(VIEW_MODE_KEY, mode)
	}, [])

	const boards = useWorkspaceBoards(workspaceId, tab, query)
	const showVisitors = useDesignSwitch('boardVisitors')
	const presence = useBoardPresence(
		boards.map((b) => b.fileId),
		showVisitors
	)

	return (
		<div className={styles.home} data-testid="tla-workspace-home">
			<TlaWorkspaceHomeToolbar
				tab={tab}
				onTabChange={setTab}
				showSharedTab={showSharedTab}
				query={query}
				onQueryChange={setQuery}
				viewMode={viewMode}
				onViewModeChange={handleViewModeChange}
			/>
			{boards.length === 0 ? (
				<div className={classNames(styles.empty, 'tla-text_ui__regular')}>
					{query ? (
						<F defaultMessage="No files match your search." />
					) : tab === 'archive' ? (
						<F defaultMessage="Archived files will appear here." />
					) : (
						<F defaultMessage="No files here yet." />
					)}
				</div>
			) : (
				<BoardPresenceProvider value={presence}>
					<div
						className={viewMode === 'grid' ? styles.grid : styles.list}
						role="list"
						data-testid="tla-workspace-boards"
					>
						{boards.map((board) => (
							<TlaBoardCard
								key={board.fileId}
								board={board}
								workspaceId={workspaceId}
								viewMode={viewMode}
								showVisitors={showVisitors}
							/>
						))}
					</div>
				</BoardPresenceProvider>
			)}
		</div>
	)
}

function useWorkspaceBoards(workspaceId: string, tab: Tab, query: string): BoardItem[] {
	const app = useApp()
	const normalizedQuery = query.trim().toLowerCase()
	return useValue(
		'workspace boards',
		() => {
			// TODO: files have no archived state yet.
			if (tab === 'archive') return []

			const boards: BoardItem[] = []
			// Same order as the sidebar: pinned first, then most recent.
			for (const { fileId, isPinned } of app.getWorkspaceFilesSorted(workspaceId)) {
				const file = app.getFile(fileId)
				if (!file) continue
				const name = app.getFileName(file)
				if (normalizedQuery && !name.toLowerCase().includes(normalizedQuery)) continue
				// The sidebar's test for its "Shared by" badge: boards the user can't administer.
				const isShared = !app.canUpdateFile(fileId)
				if (tab === 'shared' && !isShared) continue
				// TODO: files don't record who created them. In the home workspace every board that isn't
				// shared is the user's own, but a team workspace can't tell yet.
				if (tab === 'mine' && (isShared || workspaceId !== app.getHomeWorkspaceId())) continue
				boards.push({
					fileId,
					name,
					isPinned,
					date: getFileRecencyDate(app.getFileState(fileId), file),
					ownerName: isShared ? file.ownerName.trim() || undefined : undefined,
				})
			}
			return boards
		},
		[app, workspaceId, tab, normalizedQuery]
	)
}

function TlaWorkspaceHomeToolbar({
	tab,
	onTabChange,
	showSharedTab,
	query,
	onQueryChange,
	viewMode,
	onViewModeChange,
}: {
	tab: Tab
	onTabChange(tab: Tab): void
	showSharedTab: boolean
	query: string
	onQueryChange(query: string): void
	viewMode: ViewMode
	onViewModeChange(mode: ViewMode): void
}) {
	const msg = useTranslation()
	const handleCreateFile = useHandleSidebarCreateFile()

	return (
		<div className={styles.toolbar}>
			<div className={styles.tabs} role="tablist">
				<TlaWorkspaceHomeTab tab="recent" current={tab} onSelect={onTabChange}>
					<F defaultMessage="Recents" />
				</TlaWorkspaceHomeTab>
				<TlaWorkspaceHomeTab tab="mine" current={tab} onSelect={onTabChange}>
					<F defaultMessage="Created by me" />
				</TlaWorkspaceHomeTab>
				{showSharedTab && (
					<TlaWorkspaceHomeTab tab="shared" current={tab} onSelect={onTabChange}>
						<F defaultMessage="Shared with me" />
					</TlaWorkspaceHomeTab>
				)}
				<TlaWorkspaceHomeTab tab="archive" current={tab} onSelect={onTabChange}>
					<F defaultMessage="Archived" />
				</TlaWorkspaceHomeTab>
			</div>
			<div className={styles.spacer} />
			<TlaWorkspaceHomeSearch query={query} onChange={onQueryChange} />
			<TlaViewModeToggle viewMode={viewMode} onChange={onViewModeChange} />
			<TlaButton
				icon="plus"
				className={styles.newFile}
				onClick={() => handleCreateFile({ source: 'workspace-home' })}
				data-testid="tla-workspace-new-file"
			>
				{msg(messages.newFile)}
			</TlaButton>
		</div>
	)
}

function TlaWorkspaceHomeSearch({
	query,
	onChange,
}: {
	query: string
	onChange(query: string): void
}) {
	const msg = useTranslation()
	const searchLbl = msg(messages.search)
	const clearLbl = msg(messages.clearSearch)
	return (
		<div className={styles.search}>
			<TlaIcon icon="search" className={styles.searchIcon} />
			<input
				className={styles.searchInput}
				type="search"
				value={query}
				placeholder={searchLbl}
				aria-label={searchLbl}
				onChange={(e) => onChange(e.currentTarget.value)}
				onKeyDown={(e) => {
					if (e.key === 'Escape') onChange('')
				}}
				data-testid="tla-workspace-search"
			/>
			{query && (
				<button
					className={styles.searchClear}
					aria-label={clearLbl}
					title={clearLbl}
					onClick={() => onChange('')}
				>
					<TlaIcon icon="close" />
				</button>
			)}
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
				data-testid="tla-workspace-view-list"
			>
				<TldrawUiIcon icon="list" label={msg(messages.listView)} small />
			</button>
			<button
				className={styles.viewToggleButton}
				aria-pressed={viewMode === 'grid'}
				title={msg(messages.gridView)}
				onClick={() => onChange('grid')}
				data-testid="tla-workspace-view-grid"
			>
				<TlaIcon icon="layout-grid" />
			</button>
		</div>
	)
}

/** A board in the gallery, with the same actions as a file in the old sidebar. */
function TlaBoardCard({
	board,
	workspaceId,
	viewMode,
	showVisitors,
}: {
	board: BoardItem
	workspaceId: string
	viewMode: ViewMode
	showVisitors: boolean
}) {
	const app = useApp()
	const msg = useTranslation()
	const intl = useIntl()
	const trackEvent = useTldrawAppUiEvents()
	const container = useContainer()
	const hasAdminRights = useHasFileAdminRights(board.fileId)
	const [isRenaming, setIsRenaming] = useState(false)
	const [_, handleContextMenuOpenChange] = useMenuIsOpen(`file-context-menu-${board.fileId}`)
	const isCoarsePointer = getIsCoarsePointer()
	const href = routes.tlaFile(board.fileId)
	const fileMenuLbl = msg(sidebarMessages.fileMenu)
	const navigate = useNavigate()
	const showListThumbnail = useDesignSwitch('listThumbnails')

	// A renamable name opens the board on a single click and renames on a double click, so
	// the single click waits out the double-click window before navigating.
	const rPendingOpen = useRef<ReturnType<typeof setTimeout>>(undefined)
	useEffect(() => () => clearTimeout(rPendingOpen.current), [])
	const handleNameClick = useCallback(
		(e: MouseEvent) => {
			if (e.metaKey || e.ctrlKey || e.shiftKey) {
				window.open(href, '_blank')
				return
			}
			if (e.detail !== 1) return
			rPendingOpen.current = setTimeout(() => {
				trackEvent('click-file-link', { source: 'workspace-home' })
				navigate(href)
			}, 250)
		},
		[href, navigate, trackEvent]
	)

	const handleRenameAction = useCallback(() => {
		if (isCoarsePointer) {
			const name = prompt(intl.formatMessage(sidebarMessages.renameFile), board.name)
				?.slice(0, 200)
				.trim()
			if (!name) return
			app.updateFile(board.fileId, { name })
			trackEvent('rename-file', { name, source: 'workspace-home' })
		} else {
			setIsRenaming(true)
		}
	}, [app, intl, board.fileId, board.name, isCoarsePointer, trackEvent])

	const time = formatRelativeTime(new Date(board.date).toISOString(), intl.locale)
	const edited = intl.formatMessage(messages.edited, { time })

	const isDragEnabled = !isCoarsePointer

	const pinIcon = board.isPinned && (
		<TlaIcon icon="pin" className={styles.cardPinned} aria-label={msg(messages.pinned)} />
	)

	const fileMenu = (
		<TlaFileMenu
			fileId={board.fileId}
			workspaceId={workspaceId}
			source="workspace-home"
			onRenameAction={handleRenameAction}
			trigger={
				<TldrawUiButton
					type="icon"
					className={styles.cardMenuTrigger}
					tooltip={fileMenuLbl}
					title={fileMenuLbl}
				>
					<TlaIcon icon="dots-vertical-strong" />
				</TldrawUiButton>
			}
		/>
	)

	const visitors = showVisitors && (
		<TlaBoardVisitors
			fileId={board.fileId}
			href={href}
			onClick={() => trackEvent('click-file-link', { source: 'workspace-home' })}
		/>
	)

	return (
		<_ContextMenu.Root onOpenChange={handleContextMenuOpenChange} modal={false}>
			<_ContextMenu.Trigger asChild>
				<div
					className={viewMode === 'grid' ? styles.card : styles.row}
					role="listitem"
					data-testid="tla-board-card"
					data-is-pinned={board.isPinned}
					draggable={isDragEnabled}
					onDragStart={
						isDragEnabled
							? (event) => {
									// Dragging a board drags its URL, like a link: out to a new tab or another app.
									const fileUrl = routes.tlaFile(board.fileId, { asUrl: true })
									event.dataTransfer.effectAllowed = 'copyLink'
									event.dataTransfer.setData('text/uri-list', fileUrl)
									event.dataTransfer.setData('text/plain', fileUrl)
								}
							: undefined
					}
				>
					{!isRenaming && (
						<Link
							to={href}
							className={styles.cardLink}
							aria-label={board.name}
							draggable={false}
							onClick={() => trackEvent('click-file-link', { source: 'workspace-home' })}
						/>
					)}
					{viewMode === 'grid' && (
						<TlaBoardThumbnail fileId={board.fileId}>
							{pinIcon && <div className={styles.cardPinnedBadge}>{pinIcon}</div>}
							<div className={styles.cardMenu}>{fileMenu}</div>
						</TlaBoardThumbnail>
					)}
					<div className={styles.cardFooter}>
						{viewMode === 'list' && showListThumbnail && (
							<TlaBoardThumbnail fileId={board.fileId} small />
						)}
						<div className={styles.cardText}>
							<div className={styles.cardTitle}>
								{isRenaming ? (
									<TlaSidebarRenameInline
										source="workspace-home"
										fileId={board.fileId}
										onClose={() => setIsRenaming(false)}
										wrapperClassName={styles.cardRename}
										className={styles.cardRenameInput}
									/>
								) : (
									<div
										className={classNames(styles.cardName, 'notranslate')}
										data-renamable={hasAdminRights}
										onClick={hasAdminRights ? handleNameClick : undefined}
										onDoubleClick={
											hasAdminRights
												? () => {
														clearTimeout(rPendingOpen.current)
														handleRenameAction()
													}
												: undefined
										}
									>
										{board.name}
									</div>
								)}
								{viewMode === 'list' && !isRenaming && pinIcon}
							</div>
							<div className={styles.cardMeta}>
								<span className={styles.cardMetaText}>
									{board.ownerName ? `${board.ownerName} • ${edited}` : edited}
								</span>
							</div>
							{viewMode === 'list' && showVisitors && (
								// Always rendered, even when empty, so the columns line up across rows.
								<div className={styles.rowVisitors}>{visitors}</div>
							)}
						</div>
						{viewMode === 'grid' && visitors}
						{viewMode === 'list' && fileMenu}
					</div>
				</div>
			</_ContextMenu.Trigger>
			<_ContextMenu.Portal container={container}>
				<_ContextMenu.Content className="tlui-menu tlui-scrollable">
					{!isCoarsePointer && (
						<TldrawUiMenuContextProvider type="context-menu" sourceId="context-menu">
							<FileItems
								source="workspace-home"
								fileId={board.fileId}
								onRenameAction={handleRenameAction}
								workspaceId={workspaceId}
							/>
						</TldrawUiMenuContextProvider>
					)}
				</_ContextMenu.Content>
			</_ContextMenu.Portal>
		</_ContextMenu.Root>
	)
}

function TlaBoardThumbnail({
	fileId,
	small,
	children,
}: {
	fileId: string
	small?: boolean
	children?: ReactNode
}) {
	// A board nobody has edited since thumbnails shipped has none yet; the endpoint 404s.
	const [failed, setFailed] = useState(false)
	return (
		<div className={small ? styles.rowPreview : styles.cardPreview}>
			{failed ? (
				<TlaIcon icon="tldraw" className={styles.cardPreviewPlaceholder} />
			) : (
				<img
					className={styles.cardPreviewImage}
					src={`/api/app/file/${fileId}/thumbnail`}
					alt=""
					loading="lazy"
					draggable={false}
					onError={() => setFailed(true)}
				/>
			)}
			{children}
		</div>
	)
}
