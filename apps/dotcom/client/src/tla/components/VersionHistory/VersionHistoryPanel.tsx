import { Avatar, Byline } from '@tldraw/commenting'
import {
	HistoryAuthor,
	HistoryCheckpoint,
	HistoryListResponse,
	HistoryRawResponse,
	HistorySession,
	HistoryUser,
} from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { useIntl } from 'react-intl'
import {
	PORTRAIT_BREAKPOINT,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	useBreakpoint,
	useDialogs,
	useToasts,
} from 'tldraw'
import { fetchHistoryPage, saveNamedVersion } from '../../utils/versionHistoryApi'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { groupByAge, HistoryRow } from './groupByAge'
import { authorListValues, byAuthor, byNamed } from './historyFilters'
import { SaveVersionDialog } from './SaveVersionDialog'
import { versionHistoryMessages as messages } from './version-history-messages'
import { formatChangeSummary, formatVersionTime } from './versionHistoryFormat'
import styles from './version-history.module.css'

// Markup and classes follow the comments sidebar (@tldraw/commenting's CanvasCommentsSidebar), so
// the two file sidebars look and behave alike.

type Users = Record<string, HistoryUser>

const PanelContext = createContext<{
	currentUserId: string | null
	mine(entry: { authors: HistoryAuthor[]; name?: string }): boolean
}>({ currentUserId: null, mine: () => true })

interface PanelProps {
	fileId: string
	selectedTs: string | null
	onSelect(ts: string | null): void
	isStaff: boolean
	currentUserId: string | null
	actions: ReactNode
}

export function VersionHistoryPanel({
	fileId,
	selectedTs,
	onSelect,
	isStaff,
	currentUserId,
	actions,
}: PanelProps) {
	const intl = useIntl()
	const breakpoint = useBreakpoint()
	const [raw, setRaw] = useState(false)
	const [onlyMine, setOnlyMine] = useState(false)
	const [onlyNamed, setOnlyNamed] = useState(false)
	const [sessions, setSessions] = useState<HistorySession[]>([])
	const [rawVersions, setRawVersions] = useState<HistoryCheckpoint[]>([])
	const [users, setUsers] = useState<Users>({})
	const [cursor, setCursor] = useState<string | null>(null)
	const [state, setState] = useState<'loading' | 'idle' | 'error'>('loading')

	const load = useCallback(
		async (before: string | undefined, reset: boolean) => {
			setState('loading')
			try {
				const page = await fetchHistoryPage(fileId, { before, raw })
				if (raw) {
					const r = page as HistoryRawResponse
					setRawVersions((prev) => (reset ? r.versions : [...prev, ...r.versions]))
				} else {
					const p = page as HistoryListResponse
					setSessions((prev) => (reset ? p.sessions : [...prev, ...p.sessions]))
					setUsers((prev) => ({ ...prev, ...p.users }))
				}
				setCursor(page.nextCursor)
				setState('idle')
			} catch {
				setState('error')
			}
		},
		[fileId, raw]
	)

	useEffect(() => {
		void load(undefined, true)
	}, [load])

	const byMe = byAuthor(onlyMine ? currentUserId : null)
	const named = byNamed(onlyNamed)
	const mine = (entry: { authors: HistoryAuthor[]; name?: string }) => byMe(entry) && named(entry)
	const rows = useMemo(
		() =>
			groupByAge(
				sessions.filter(mine),
				new Date(),
				Intl.DateTimeFormat().resolvedOptions().timeZone
			),
		// mine only changes with onlyMine
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[sessions, onlyMine, onlyNamed, currentUserId]
	)
	const { addDialog } = useDialogs()
	const { addToast } = useToasts()
	const openSaveDialog = useCallback(() => {
		addDialog({
			component: ({ onClose }) => (
				<SaveVersionDialog
					onClose={onClose}
					onSave={async (name) => {
						try {
							const { ts } = await saveNamedVersion(fileId, name)
							await load(undefined, true)
							onSelect(ts)
							addToast({ id: 'version-saved', title: intl.formatMessage(messages.versionSaved) })
						} catch {
							addToast({
								id: 'version-save-failed',
								title: intl.formatMessage(messages.saveFailed),
								severity: 'error',
							})
						}
					}}
				/>
			),
		})
	}, [addDialog, addToast, fileId, intl, load, onSelect])
	const visibleRaw = rawVersions.filter(mine)
	const loadedAny = raw ? rawVersions.length > 0 : sessions.length > 0
	const isEmpty = state === 'idle' && (raw ? !visibleRaw.length : !rows.length)

	return (
		<div
			className={classNames('tlui-cmt-canvas-sidebar', {
				[styles.sheet]: breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM,
			})}
			onPointerDown={(e) => e.stopPropagation()}
			onContextMenu={(e) => e.stopPropagation()}
		>
			<PanelContext.Provider value={{ currentUserId, mine }}>
				<div className="tlui-cmt-list">
					<div className="tlui-cmt-list__header">
						<span className="tlui-cmt-list__header-title">
							{intl.formatMessage(messages.title)}
						</span>
						<div className="tlui-cmt-list__header-actions">
							<TldrawUiButton
								type="icon"
								className="tlui-cmt-header-btn"
								tooltip={intl.formatMessage(messages.saveVersion)}
								title={intl.formatMessage(messages.saveVersion)}
								onClick={openSaveDialog}
							>
								<TldrawUiButtonIcon icon="plus" />
							</TldrawUiButton>
							<HistoryOptionsMenu
								onlyMine={onlyMine}
								onOnlyMineChange={currentUserId ? setOnlyMine : undefined}
								onlyNamed={onlyNamed}
								onOnlyNamedChange={setOnlyNamed}
								raw={raw}
								onRawChange={isStaff ? setRaw : undefined}
							/>
						</div>
					</div>
					<div className="tlui-cmt-list__items">
						<button
							type="button"
							className={classNames('tlui-cmt-list__item', {
								'tlui-cmt-list__item--selected': selectedTs === null,
							})}
							onClick={() => onSelect(null)}
						>
							<span className={styles.currentDot} aria-hidden />
							<div className="tlui-cmt-list__item-body">
								<div className="tlui-cmt-head">
									<span className="tlui-cmt-author">
										{intl.formatMessage(messages.currentVersion)}
									</span>
								</div>
							</div>
						</button>
						{raw
							? visibleRaw.map((v) => (
									<VersionRow
										key={v.ts}
										ts={v.ts}
										name={v.name}
										authors={v.authors}
										counts={v}
										users={users}
										selected={selectedTs === v.ts}
										onSelect={onSelect}
									/>
								))
							: rows.map((row) => (
									<HistoryRowView
										key={row.level === 'session' ? row.session.end : row.key}
										row={row}
										users={users}
										selectedTs={selectedTs}
										onSelect={onSelect}
									/>
								))}
						{state === 'loading' && (
							<div className="tlui-cmt-list__empty">{intl.formatMessage(messages.loading)}</div>
						)}
						{state === 'error' && (
							<div className="tlui-cmt-list__empty">{intl.formatMessage(messages.failed)}</div>
						)}
						{isEmpty && (
							<div className="tlui-cmt-list__empty">
								{intl.formatMessage(
									!loadedAny
										? messages.empty
										: onlyNamed
											? messages.emptyNamed
											: onlyMine
												? messages.emptyMine
												: messages.empty
								)}
							</div>
						)}
						{state === 'idle' && cursor && (
							<button type="button" className={styles.loadMore} onClick={() => load(cursor, false)}>
								{intl.formatMessage(messages.loadMore)}
							</button>
						)}
					</div>
					{selectedTs && <div className={styles.actions}>{actions}</div>}
				</div>
			</PanelContext.Provider>
		</div>
	)
}

/** Same trigger and menu as the comments filter menu. */
function HistoryOptionsMenu({
	onlyMine,
	onOnlyMineChange,
	onlyNamed,
	onOnlyNamedChange,
	raw,
	onRawChange,
}: {
	onlyMine: boolean
	onOnlyMineChange?(onlyMine: boolean): void
	onlyNamed: boolean
	onOnlyNamedChange(onlyNamed: boolean): void
	raw: boolean
	/** Staff only: every stored save, ungrouped. */
	onRawChange?(raw: boolean): void
}) {
	const intl = useIntl()
	const label = intl.formatMessage(messages.historyOptions)
	return (
		<>
			<TldrawUiDropdownMenuRoot id="version-history-options">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton type="icon" tooltip={label} title={label} className="tlui-cmt-header-btn">
						<TldrawUiButtonIcon icon="dots-vertical" />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="end" alignOffset={0}>
					<TldrawUiMenuContextProvider type="menu" sourceId="menu">
						<TldrawUiMenuGroup id="version-history-options">
							<TldrawUiMenuCheckboxItem
								id="only-named-versions"
								readonlyOk
								label={intl.formatMessage(messages.onlyNamed)}
								checked={onlyNamed}
								onSelect={() => onOnlyNamedChange(!onlyNamed)}
							/>
							{onOnlyMineChange && (
								<TldrawUiMenuCheckboxItem
									id="only-my-changes"
									readonlyOk
									label={intl.formatMessage(messages.onlyMine)}
									checked={onlyMine}
									onSelect={() => onOnlyMineChange(!onlyMine)}
								/>
							)}
							{onRawChange && (
								<TldrawUiMenuCheckboxItem
									id="show-every-autosave"
									readonlyOk
									label={intl.formatMessage(messages.showRaw)}
									checked={raw}
									onSelect={() => onRawChange(!raw)}
								/>
							)}
						</TldrawUiMenuGroup>
					</TldrawUiMenuContextProvider>
				</TldrawUiDropdownMenuContent>
			</TldrawUiDropdownMenuRoot>
		</>
	)
}

function HistoryRowView({
	row,
	users,
	selectedTs,
	onSelect,
}: {
	row: HistoryRow
	users: Users
	selectedTs: string | null
	onSelect(ts: string): void
}) {
	const intl = useIntl()
	const [expanded, setExpanded] = useState(false)
	if (row.level === 'session') {
		return (
			<SessionRow session={row.session} users={users} selectedTs={selectedTs} onSelect={onSelect} />
		)
	}
	return (
		<>
			<VersionRow
				ts={row.end}
				authors={row.authors}
				counts={row}
				users={users}
				selected={selectedTs === row.end}
				onSelect={onSelect}
				toggle={{
					expanded,
					label: intl.formatMessage(messages.sessionCount, { count: row.sessions.length }),
					onToggle: () => setExpanded((e) => !e),
				}}
			/>
			{expanded &&
				row.sessions.map((s) => (
					<SessionRow
						key={s.end}
						session={s}
						users={users}
						selectedTs={selectedTs}
						onSelect={onSelect}
						nested
					/>
				))}
		</>
	)
}

function SessionRow({
	session,
	users,
	selectedTs,
	onSelect,
	nested,
}: {
	session: HistorySession
	users: Users
	selectedTs: string | null
	onSelect(ts: string): void
	nested?: boolean
}) {
	const intl = useIntl()
	const [expanded, setExpanded] = useState(false)
	const { mine } = useContext(PanelContext)
	const earlier = session.points.filter(mine)
	const canExpand = !session.restore && !session.name && earlier.length > 0

	const preview = session.restore
		? intl.formatMessage(messages.restoredFrom, {
				time: formatVersionTime(session.restore.restoredFrom).time,
			})
		: undefined

	return (
		<>
			<VersionRow
				ts={session.end}
				name={session.name}
				preview={preview}
				authors={session.authors}
				counts={session}
				users={users}
				selected={selectedTs === session.end}
				onSelect={onSelect}
				nested={nested}
				toggle={
					canExpand
						? {
								expanded,
								label: expanded
									? intl.formatMessage(messages.hideEarlier)
									: intl.formatMessage(messages.showEarlier),
								onToggle: () => setExpanded((e) => !e),
							}
						: undefined
				}
			/>
			{expanded &&
				earlier.map((p) => (
					<VersionRow
						key={p.ts}
						ts={p.ts}
						authors={p.authors}
						counts={p}
						users={users}
						selected={selectedTs === p.ts}
						onSelect={onSelect}
						nested
					/>
				))}
		</>
	)
}

function toAuthor(
	authors: HistoryAuthor[],
	users: Users,
	currentUserId: string | null,
	intl: ReturnType<typeof useIntl>
) {
	const nameOf = (a: HistoryAuthor) =>
		a.agent
			? intl.formatMessage(messages.agent)
			: a.userId === currentUserId && a.userId
				? intl.formatMessage(messages.you)
				: a.userId
					? (users[a.userId]?.name ?? intl.formatMessage(messages.someone))
					: intl.formatMessage(messages.anonymous)
	const first = authors[0]
	if (!first) return { name: intl.formatMessage(messages.someone) }
	const color = first.userId && !first.agent ? users[first.userId]?.color : undefined
	return {
		name: intl.formatMessage(messages.authors, authorListValues(authors.map(nameOf))),
		color,
	}
}

function VersionRow({
	ts,
	name,
	preview,
	authors,
	counts,
	users,
	selected,
	onSelect,
	nested,
	toggle,
}: {
	ts: string
	name?: string
	preview?: string
	authors: HistoryAuthor[]
	counts: { added: number; updated: number; removed: number }
	users: Users
	selected: boolean
	onSelect(ts: string): void
	nested?: boolean
	toggle?: { expanded: boolean; label: string; onToggle(): void }
}) {
	const intl = useIntl()
	const { currentUserId } = useContext(PanelContext)
	const author = toAuthor(authors, users, currentUserId, intl)
	const summary = formatChangeSummary(counts, (kind, count) =>
		intl.formatMessage(
			kind === 'added'
				? messages.shapesAdded
				: kind === 'edited'
					? messages.shapesEdited
					: messages.shapesDeleted,
			{ count }
		)
	)
	return (
		<div
			role="button"
			tabIndex={0}
			className={classNames('tlui-cmt-list__item', {
				'tlui-cmt-list__item--selected': selected,
				[styles.nested]: nested,
			})}
			onClick={() => onSelect(ts)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					onSelect(ts)
				}
			}}
		>
			<Avatar author={author} />
			<div className="tlui-cmt-list__item-body">
				<Byline author={author} date={ts} />
				{name && <div className={styles.versionName}>{name}</div>}
				{(preview || summary) && (
					<div className="tlui-cmt-list__item-preview">{preview ?? summary}</div>
				)}
				{toggle && (
					<div className="tlui-cmt-list__item-meta">
						<button
							type="button"
							className={styles.expand}
							aria-expanded={toggle.expanded}
							onClick={(e) => {
								e.stopPropagation()
								toggle.onToggle()
							}}
						>
							<TlaIcon icon={toggle.expanded ? 'chevron-up' : 'chevron-down'} />
							{toggle.label}
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
