import { formatRelativeTime } from '@tldraw/commenting'
import classNames from 'classnames'
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import {
	defineMessages,
	F,
	getFromLocalStorage,
	setInLocalStorage,
	TldrawUiButton,
	TldrawUiIcon,
	useTranslation,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { getFileRecencyDate } from '../../app/TldrawApp'
import { useApp } from '../../hooks/useAppState'
import { useWorkspaceName } from '../../hooks/useWorkspaceName'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { useHandleSidebarCreateFile } from '../TlaSidebar/components/TlaSidebarCreateFileButton'
import { sidebarMessages } from '../TlaSidebar/components/TlaSidebarFileLink'
import styles from './workspace-home.module.css'

const messages = defineMessages({
	newBoard: { defaultMessage: 'New board' },
	boardMenu: { defaultMessage: 'Board menu' },
	listView: { defaultMessage: 'List view' },
	gridView: { defaultMessage: 'Grid view' },
	search: { defaultMessage: 'Search your boards…' },
	clearSearch: { defaultMessage: 'Clear search' },
	pin: { defaultMessage: 'Pin file' },
	unpin: { defaultMessage: 'Unpin file' },
})

type Tab = 'recent' | 'favorites' | 'archive' | 'shared'
type ViewMode = 'grid' | 'list'

const VIEW_MODE_KEY = 'tla-workspace-home-view-mode'
const MIN_BOARD_SLOTS = 6

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
			<TlaWorkspaceHomeHeader workspaceId={workspaceId} resultCount={boards.length} />
			<div className={styles.navigation}>
				<div className={styles.tabs} role="tablist">
					<TlaWorkspaceHomeTab tab="recent" current={tab} onSelect={setTab}>
						<F defaultMessage="Recently viewed" />
					</TlaWorkspaceHomeTab>
					<TlaWorkspaceHomeTab tab="favorites" current={tab} onSelect={setTab}>
						<F defaultMessage="Favorites" />
					</TlaWorkspaceHomeTab>
					<TlaWorkspaceHomeTab tab="shared" current={tab} onSelect={setTab}>
						<F defaultMessage="Shared with me" />
					</TlaWorkspaceHomeTab>
					<TlaWorkspaceHomeTab tab="archive" current={tab} onSelect={setTab}>
						<F defaultMessage="Archive" />
					</TlaWorkspaceHomeTab>
				</div>
				<TlaViewModeToggle viewMode={viewMode} onChange={handleViewModeChange} />
			</div>

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
				{Array.from({ length: Math.max(0, MIN_BOARD_SLOTS - boards.length) }, (_, index) => (
					<TlaBoardSkeleton key={index} viewMode={viewMode} />
				))}
			</div>
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
			for (const { fileId, isPinned } of app.getWorkspaceFilesSorted(workspaceId)) {
				if (tab === 'favorites' && !isPinned) continue
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
					isPinned,
					date: getFileRecencyDate(app.getFileState(fileId), file),
					ownerName: isShared ? file.ownerName : undefined,
				})
			}
			return boards.sort((a, b) => b.date - a.date)
		},
		[app, workspaceId, tab]
	)
}

function TlaWorkspaceHomeHeader({
	workspaceId,
	resultCount,
}: {
	workspaceId: string
	resultCount: number
}) {
	const app = useApp()
	const msg = useTranslation()
	const name = useWorkspaceName(workspaceId)
	const handleCreateFile = useHandleSidebarCreateFile()
	const inputRef = useRef<HTMLInputElement>(null)
	const query = useValue('workspace search', () => app.sidebarState.get().searchQuery, [app])
	const setQuery = (searchQuery: string) =>
		app.sidebarState.update((prev) => ({ ...prev, searchQuery }))

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				inputRef.current?.focus()
				inputRef.current?.select()
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [])

	return (
		<div className={styles.header}>
			<h1 className={styles.screenReaderOnly} data-testid="tla-workspace-title">
				{name}
			</h1>
			<div className={styles.search}>
				<TlaIcon icon="search" />
				<input
					ref={inputRef}
					type="search"
					aria-label={msg(messages.search)}
					placeholder={msg(messages.search)}
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Escape') setQuery('')
					}}
					data-testid="tla-workspace-search"
				/>
				{query.trim() && (
					<span className={styles.searchSummary} role="status">
						<F
							defaultMessage="{count, plural, one {# board} other {# boards}} found"
							values={{ count: resultCount }}
						/>
					</span>
				)}
				{query ? (
					<button
						className={styles.clearSearch}
						aria-label={msg(messages.clearSearch)}
						onClick={() => {
							setQuery('')
							inputRef.current?.focus()
						}}
					>
						<TlaIcon icon="close" />
					</button>
				) : (
					<kbd className={styles.shortcut}>
						<F
							defaultMessage="{modifier} K"
							values={{ modifier: navigator.platform.includes('Mac') ? '⌘' : 'Ctrl' }}
						/>
					</kbd>
				)}
			</div>
			<TlaButton
				className={styles.createButton}
				icon="plus-strong"
				onClick={handleCreateFile}
				data-testid="tla-workspace-new-board"
			>
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
			tabIndex={tab === current ? 0 : -1}
			onKeyDown={(event) => {
				const tabs: Tab[] = ['recent', 'favorites', 'shared', 'archive']
				const index = tabs.indexOf(tab)
				let nextIndex: number
				if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
				else if (event.key === 'ArrowLeft') nextIndex = (index + tabs.length - 1) % tabs.length
				else if (event.key === 'Home') nextIndex = 0
				else if (event.key === 'End') nextIndex = tabs.length - 1
				else return
				event.preventDefault()
				onSelect(tabs[nextIndex])
				event.currentTarget.parentElement
					?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
					.item(nextIndex)
					?.focus()
			}}
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
			<TlaBoardThumbnail fileId={board.fileId} />
			<div className={styles.cardFooter}>
				<div className={styles.cardText}>
					<div className={classNames(styles.cardName, 'notranslate')}>{board.name}</div>
					{(viewMode === 'grid' || board.ownerName) && (
						<div className={styles.cardMeta}>
							{board.ownerName ? (
								<F defaultMessage="Shared by {name}" values={{ name: board.ownerName }} />
							) : (
								time
							)}
						</div>
					)}
				</div>
				{viewMode === 'list' && <span className={styles.rowDate}>{time}</span>}

				<button
					className={styles.pinButton}
					aria-label={msg(board.isPinned ? messages.unpin : messages.pin)}
					title={msg(board.isPinned ? messages.unpin : messages.pin)}
					aria-pressed={board.isPinned}
					onClick={() => {
						if (board.isPinned) app.z.mutate.unpinFile({ fileId: board.fileId, workspaceId })
						else app.z.mutate.pinFile({ fileId: board.fileId, workspaceId })
					}}
				>
					<TlaIcon icon={board.isPinned ? 'star-fill' : 'star'} />
				</button>
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

function TlaBoardSkeleton({ viewMode }: { viewMode: ViewMode }) {
	return (
		<div
			className={classNames(viewMode === 'grid' ? styles.card : styles.row, styles.skeleton)}
			data-testid="tla-board-skeleton"
			aria-hidden="true"
		>
			<div className={styles.cardPreview} />
			<div className={styles.cardFooter}>
				<div className={styles.cardText}>
					<div className={styles.skeletonName} />
					{viewMode === 'grid' && <div className={styles.skeletonMeta} />}
				</div>
				{viewMode === 'list' && (
					<span className={classNames(styles.rowDate, styles.skeletonMeta)} />
				)}
			</div>
		</div>
	)
}

function TlaBoardThumbnail({ fileId }: { fileId: string }) {
	// A board nobody has edited since thumbnails shipped has none yet; the endpoint 404s.
	const [failed, setFailed] = useState(false)
	return (
		<div className={styles.cardPreview}>
			<div className={styles.previewPlaceholder} aria-hidden="true">
				<TlaIcon icon="layout-grid" />
			</div>
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
