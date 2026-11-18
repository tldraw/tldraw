import { formatRelativeTime } from '@tldraw/commenting'
import classNames from 'classnames'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import {
	KeyboardEvent,
	MouseEvent,
	ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
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

type Tab = 'recent' | 'archive' | 'shared'
type ViewMode = 'grid' | 'list'

const VIEW_MODE_KEY = 'tla-workspace-home-view-mode'

interface BoardItem {
	fileId: string
	name: string
	date: number
	isPinned: boolean
	/** Set for boards owned by someone outside this workspace. */
	ownerName?: string
}

export function TlaWorkspaceHome({ workspaceId }: { workspaceId: string }) {
	const [tab, setTab] = useState<Tab>('recent')
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
				// Owned by a workspace the user isn't in: a shared board they opened as a guest.
				const isShared = !!file.owningGroupId && !app.getWorkspaceMembership(file.owningGroupId)
				if (tab === 'shared' && !isShared) continue
				boards.push({
					fileId,
					name,
					isPinned,
					date: getFileRecencyDate(app.getFileState(fileId), file),
					ownerName: isShared ? file.ownerName : undefined,
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
	query,
	onQueryChange,
	viewMode,
	onViewModeChange,
}: {
	tab: Tab
	onTabChange(tab: Tab): void
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
					<F defaultMessage="Recently viewed" />
				</TlaWorkspaceHomeTab>
				<TlaWorkspaceHomeTab tab="shared" current={tab} onSelect={onTabChange}>
					<F defaultMessage="Shared with me" />
				</TlaWorkspaceHomeTab>
				<TlaWorkspaceHomeTab tab="archive" current={tab} onSelect={onTabChange}>
					<F defaultMessage="Archive" />
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
			const name = prompt(intl.formatMessage(sidebarMessages.renameFile), board.name)?.trim()
			if (name) app.updateFile(board.fileId, { name })
		} else {
			setIsRenaming(true)
		}
	}, [app, intl, board.fileId, board.name, isCoarsePointer])

	const handleRenameComplete = useCallback(
		(name: string) => {
			setIsRenaming(false)
			const trimmed = name.trim()
			if (!trimmed || trimmed === board.name) return
			app.updateFile(board.fileId, { name: trimmed })
			trackEvent('rename-file', { name: trimmed, source: 'workspace-home' })
		},
		[app, board.fileId, board.name, trackEvent]
	)

	const time = formatRelativeTime(new Date(board.date).toISOString(), intl.locale)
	const edited = intl.formatMessage(messages.edited, { time })

	const isDragEnabled = !isCoarsePointer

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
					{viewMode === 'grid' && <TlaBoardThumbnail fileId={board.fileId} />}
					<div className={styles.cardFooter}>
						{viewMode === 'list' && showListThumbnail && (
							<TlaBoardThumbnail fileId={board.fileId} small />
						)}
						<div className={styles.cardText}>
							{isRenaming ? (
								<TlaBoardRenameInput
									defaultValue={board.name}
									onComplete={handleRenameComplete}
									onCancel={() => setIsRenaming(false)}
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
							<div className={styles.cardMeta}>
								{board.isPinned && (
									<TlaIcon
										icon="pin"
										className={styles.cardPinned}
										aria-label={msg(messages.pinned)}
									/>
								)}
								<span className={styles.cardMetaText}>
									{board.ownerName ? `${board.ownerName} • ${edited}` : edited}
								</span>
							</div>
						</div>
						{showVisitors && (
							<TlaBoardVisitors
								fileId={board.fileId}
								href={href}
								onClick={() => trackEvent('click-file-link', { source: 'workspace-home' })}
							/>
						)}
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

function TlaBoardRenameInput({
	defaultValue,
	onComplete,
	onCancel,
}: {
	defaultValue: string
	onComplete(name: string): void
	onCancel(): void
}) {
	const msg = useTranslation()
	// Escape cancels, but the blur it causes as the input unmounts must not then save.
	const [isDone, setIsDone] = useState(false)
	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			setIsDone(true)
			onComplete(e.currentTarget.value)
		} else if (e.key === 'Escape') {
			setIsDone(true)
			onCancel()
		}
	}
	return (
		<input
			className={classNames(styles.cardRenameInput, 'notranslate')}
			defaultValue={defaultValue}
			aria-label={msg(sidebarMessages.renameFile)}
			autoFocus
			onFocus={(e) => e.currentTarget.select()}
			onKeyDown={handleKeyDown}
			onBlur={(e) => {
				if (!isDone) onComplete(e.currentTarget.value)
			}}
			data-testid="tla-board-rename-input"
		/>
	)
}

function TlaBoardThumbnail({ fileId, small }: { fileId: string; small?: boolean }) {
	// A board nobody has edited since thumbnails shipped has none yet; the endpoint 404s.
	const [failed, setFailed] = useState(false)
	return (
		<div className={small ? styles.rowPreview : styles.cardPreview}>
			{failed ? (
				<TlaSemicolon className={styles.cardPreviewPlaceholder} />
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
		</div>
	)
}

/** The semicolon from the tldraw mark, without its rounded square. */
function TlaSemicolon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="5.6 2.9 4.2 9.5" aria-hidden="true">
			<path
				fill="currentColor"
				d="M9.055 4.5a1.35 1.35 0 1 1-2.7 0 1.35 1.35 0 0 1 2.7 0M7.262 12.15c.635.002 1.246-.88 1.475-1.372.281-.606.457-1.696.175-2.342-.198-.452-.652-.786-1.25-.786-.722 0-1.307.586-1.307 1.31 0 .2.046.387.127.553.075.154.174.314.274.476.315.508.637 1.03.244 1.398-.318.3-.218.761.262.763"
			/>
		</svg>
	)
}
