import classNames from 'classnames'
import { ReactElement, memo, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TldrawUiInput, preventDefault, useValue } from 'tldraw'
import { F, defineMessages, useIntl } from '../../app/i18n'
import { useApp } from '../../hooks/useAppState'
import { useIsFileOwner } from '../../hooks/useIsFileOwner'
import { useTldrFileDrop } from '../../hooks/useTldrFileDrop'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getRelevantDates } from '../../utils/dates'
import { getLocalSessionState, updateLocalSessionState } from '../../utils/local-session-state'
import { getFilePath } from '../../utils/urls'
import { TlaAccountMenu } from '../TlaAccountMenu/TlaAccountMenu'
import { TlaAvatar } from '../TlaAvatar/TlaAvatar'
import { TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaIcon, TlaIconWrapper } from '../TlaIcon/TlaIcon'
import { TlaSpacer } from '../TlaSpacer/TlaSpacer'
import styles from './sidebar.module.css'

const messages = defineMessages({
	create: { defaultMessage: 'Create file' },
	toggleSidebar: { defaultMessage: 'Toggle sidebar' },
	accountMenu: { defaultMessage: 'Account menu' },
	fileMenu: { defaultMessage: 'File menu' },
})

export const TlaSidebar = memo(function TlaSidebar() {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => getLocalSessionState().isSidebarOpen, [app])
	const isSidebarOpenMobile = useValue(
		'sidebar open mobile',
		() => getLocalSessionState().isSidebarOpenMobile,
		[app]
	)
	const sidebarRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const sidebarEl = sidebarRef.current
		if (!sidebarEl) return

		function handleWheel(e: WheelEvent) {
			if (!sidebarEl) return
			// Ctrl/Meta key indicates a pinch event (funny, eh?)
			if (sidebarEl.contains(e.target as Node) && (e.ctrlKey || e.metaKey)) {
				preventDefault(e)
			}
		}

		sidebarEl.addEventListener('wheel', handleWheel, { passive: false })
		return () => sidebarEl.removeEventListener('wheel', handleWheel)
	}, [sidebarRef])

	const handleOverlayClick = useCallback(() => {
		updateLocalSessionState(() => ({ isSidebarOpenMobile: false }))
	}, [])

	const { onDrop, onDragOver, onDragEnter, onDragLeave, isDraggingOver } = useTldrFileDrop()

	return (
		<div ref={sidebarRef}>
			<button
				className={styles.sidebarOverlayMobile}
				data-visiblemobile={isSidebarOpenMobile}
				onClick={handleOverlayClick}
			/>
			<div
				className={styles.sidebar}
				data-visible={isSidebarOpen}
				data-visiblemobile={isSidebarOpenMobile}
				data-test-id="tla-sidebar"
				onDropCapture={onDrop}
				onDragOver={onDragOver}
				onDragEnter={onDragEnter}
				onDragLeave={onDragLeave}
				data-dragging={isDraggingOver}
			>
				<div className={styles.top}>
					<TlaSidebarWorkspaceLink />
					<TlaSidebarCreateFileButton />
				</div>
				<div className={styles.content}>
					<TlaSidebarRecentFiles />
				</div>
				<div className={styles.bottom} data-testid="tla-sidebar-bottom">
					<TlaSidebarUserLink />
				</div>
			</div>
		</div>
	)
})

function TlaSidebarWorkspaceLink() {
	const brandName = 'tldraw'

	return (
		<div className={styles.workspace} data-testid="tla-sidebar-logo-icon">
			<TlaIconWrapper data-size="m">
				<TlaIcon className="tla-tldraw-sidebar-icon" icon="tldraw" />
			</TlaIconWrapper>
			<div className={classNames(styles.label, 'tla-text_ui__title', 'notranslate')}>
				{brandName}
			</div>
			{/* <button className={styles.linkButton} title={homeLbl} /> */}
		</div>
	)
}

function TlaSidebarCreateFileButton() {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const intl = useIntl()
	const createTitle = intl.formatMessage(messages.create)

	const handleSidebarCreate = useCallback(async () => {
		const res = await app.createFile()
		if (res.ok) {
			const { file } = res.value
			navigate(getFilePath(file.id), { state: { mode: 'create' } })
			trackEvent('create-file', { source: 'sidebar' })
		}
	}, [app, navigate, trackEvent])

	return (
		<button
			className={styles.create}
			onClick={handleSidebarCreate}
			data-testid="tla-create-file"
			title={createTitle}
		>
			<TlaIcon icon="edit-strong" />
		</button>
	)
}

function TlaSidebarUserLink() {
	const app = useApp()
	const intl = useIntl()
	const accountMenuLbl = intl.formatMessage(messages.accountMenu)

	const user = useValue(
		'auth',
		() => {
			return app.getUser()
		},
		[app]
	)

	if (!user) {
		return null
	}

	return (
		<TlaAccountMenu source="sidebar">
			<div className={classNames(styles.user, styles.hoverable, 'tla-text_ui__regular')}>
				<TlaAvatar img={user.avatar} />
				<div className={classNames(styles.userName, 'notranslate')}>{user.name}</div>
				<button className={styles.linkMenu} title={accountMenuLbl}>
					<TlaIcon icon="dots-vertical-strong" />
				</button>
			</div>
		</TlaAccountMenu>
	)
}

function TlaSidebarRecentFiles() {
	const app = useApp()
	const results = useValue(
		'recent user files',
		() => {
			return app.getUserRecentFiles()
		},
		[app]
	)

	if (!results) throw Error('Could not get files')

	const { today, yesterday, thisWeek, thisMonth } = getRelevantDates()

	// split the files into today, yesterday, this week, this month, and then by month
	const todayFiles: RecentFile[] = []
	const yesterdayFiles: RecentFile[] = []
	const thisWeekFiles: RecentFile[] = []
	const thisMonthFiles: RecentFile[] = []

	// todo: order by month
	const olderFiles: RecentFile[] = []

	for (const item of results) {
		const { date } = item
		if (date >= today) {
			todayFiles.push(item)
		} else if (date >= yesterday) {
			yesterdayFiles.push(item)
		} else if (date >= thisWeek) {
			thisWeekFiles.push(item)
		} else if (date >= thisMonth) {
			thisMonthFiles.push(item)
		} else {
			olderFiles.push(item)
		}
	}
	const sortedOlderFiles = olderFiles.sort((a, b) => b.date - a.date)

	return (
		<>
			{todayFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="Today" />} items={todayFiles} />
			) : null}
			{yesterdayFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="Yesterday" />} items={yesterdayFiles} />
			) : null}
			{thisWeekFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="This week" />} items={thisWeekFiles} />
			) : null}
			{thisMonthFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="This month" />} items={thisMonthFiles} />
			) : null}
			{olderFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="Older" />} items={sortedOlderFiles} />
			) : null}
		</>
	)
}

function TlaSidebarFileSection({ title, items }: { title: ReactElement; items: RecentFile[] }) {
	return (
		<div className={styles.section}>
			<TlaSpacer height="8" />
			<div className={classNames(styles.sectionTitle, 'tla-text_ui__medium')}>{title}</div>
			{items.map((item, index) => (
				<TlaSidebarFileLink key={'recent_' + item.fileId} item={item} index={index} />
			))}
		</div>
	)
}

const ACTIVE_FILE_LINK_ID = 'tla-active-file-link'
function scrollActiveFileLinkIntoView() {
	const el = document.getElementById(ACTIVE_FILE_LINK_ID)
	if (el) {
		el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
	}
}

function TlaSidebarFileLink({ item, index }: { item: RecentFile; index: number }) {
	const { fileId } = item
	const isOwnFile = useIsFileOwner(fileId)
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const isActive = fileSlug === fileId
	useEffect(() => {
		if (isActive) {
			scrollActiveFileLinkIntoView()
		}
	}, [isActive])
	const [isRenaming, setIsRenaming] = useState(false)
	const trackEvent = useTldrawAppUiEvents()

	const handleRenameAction = () => setIsRenaming(true)

	const handleRenameClose = () => setIsRenaming(false)

	const app = useApp()

	if (isRenaming) {
		return <TlaRenameInline source="sidebar" fileId={fileId} onClose={handleRenameClose} />
	}

	return (
		<div
			className={classNames(styles.link, styles.hoverable)}
			data-active={isActive}
			data-element="file-link"
			data-testid={`tla-file-link-${index}`}
			onDoubleClick={handleRenameAction}
			// We use this id to scroll the active file link into view when creating or deleting files.
			id={isActive ? ACTIVE_FILE_LINK_ID : undefined}
		>
			<div className={styles.linkContent}>
				<div
					className={classNames(styles.label, 'tla-text_ui__regular', 'notranslate')}
					data-testid={`tla-file-name-${index}`}
				>
					{app.getFileName(fileId)} {isOwnFile ? null : <F defaultMessage="(Guest)" />}
				</div>
			</div>
			<Link
				onClick={() => trackEvent('click-file-link', { source: 'sidebar' })}
				to={getFilePath(fileId)}
				className={styles.linkButton}
			/>
			<TlaSidebarFileLinkMenu fileId={fileId} onRenameAction={handleRenameAction} />
		</div>
	)
}

function TlaRenameInline({
	fileId,
	onClose,
	source,
}: {
	fileId: string
	onClose(): void
	source: TLAppUiEventSource
}) {
	const app = useApp()
	const ref = useRef<HTMLInputElement>(null)
	const trackEvent = useTldrawAppUiEvents()

	const handleSave = useCallback(() => {
		// rename the file
		const elm = ref.current
		if (!elm) return
		const name = elm.value.slice(0, 312).trim()

		if (name) {
			// Only update the name if there is a name there to update
			app.updateFile({ id: fileId, name })
		}
		trackEvent('rename-file', { name, source })
		onClose()
	}, [app, fileId, onClose, trackEvent, source])

	useEffect(() => {
		// if clicking away from the input, close the rename and save
		function handleClick(e: MouseEvent) {
			const target = e.target as HTMLElement
			if (!target.closest(`.${styles.renameWrapper}`)) {
				handleSave()
			}
		}

		// We wait a tick because we don't want to immediately close the input.
		setTimeout(() => {
			document.addEventListener('click', handleClick, { capture: true })
		}, 0)

		return () => {
			document.removeEventListener('click', handleClick, { capture: true })
		}
	}, [handleSave, onClose])

	return (
		<div className={styles.renameWrapper}>
			<TldrawUiInput
				ref={ref}
				className={classNames(styles.rename, 'tla-text_ui__regular')}
				defaultValue={app.getFileName(fileId)}
				onComplete={handleSave}
				onCancel={onClose}
				autoSelect
				autoFocus
			/>
		</div>
	)
}

/* ---------------------- Menu ---------------------- */

function TlaSidebarFileLinkMenu({
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

export function TlaSidebarToggle() {
	const trackEvent = useTldrawAppUiEvents()
	const intl = useIntl()
	const toggleLbl = intl.formatMessage(messages.toggleSidebar)

	return (
		<button
			className={styles.toggle}
			data-mobile={false}
			data-testid="tla-sidebar-toggle"
			title={toggleLbl}
			onClick={() => {
				updateLocalSessionState((s) => ({ isSidebarOpen: !s.isSidebarOpen }))
				trackEvent('sidebar-toggle', {
					value: getLocalSessionState().isSidebarOpen,
					source: 'sidebar',
				})
			}}
		>
			<TlaIcon icon="sidebar" />
		</button>
	)
}

export function TlaSidebarToggleMobile() {
	const trackEvent = useTldrawAppUiEvents()
	const intl = useIntl()
	const toggleSidebarLbl = intl.formatMessage(messages.toggleSidebar)

	return (
		<button
			className={styles.toggle}
			data-mobile={true}
			data-testid="tla-sidebar-toggle-mobile"
			title={toggleSidebarLbl}
			onClick={() => {
				updateLocalSessionState((s) => ({ isSidebarOpenMobile: !s.isSidebarOpenMobile }))
				trackEvent('sidebar-toggle', {
					value: getLocalSessionState().isSidebarOpenMobile,
					source: 'sidebar',
				})
			}}
		>
			<TlaIcon icon="sidebar" />
		</button>
	)
}

interface RecentFile {
	fileId: string
	date: number
}
