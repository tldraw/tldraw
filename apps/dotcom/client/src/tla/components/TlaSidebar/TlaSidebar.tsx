import { TldrawAppFile, TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { memo, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { preventDefault, useValue } from 'tldraw'
import { TldrawApp } from '../../app/TldrawApp'
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
import { useTldrFileDrop } from '../../hooks/useTldrFileDrop'
import { getLocalSessionState, updateLocalSessionState } from '../../utils/local-session-state'
import { getFileUrl } from '../../utils/urls'
import { TlaAccountMenu } from '../TlaAccountMenu/TlaAccountMenu'
import { TlaAvatar } from '../TlaAvatar/TlaAvatar'
import { TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaIcon, TlaIconWrapper } from '../TlaIcon/TlaIcon'
import { TlaSpacer } from '../TlaSpacer/TlaSpacer'
import styles from './sidebar.module.css'

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
				<div className={styles.bottom}>
					<TlaSidebarUserLink />
				</div>
			</div>
		</div>
	)
})

function TlaSidebarWorkspaceLink() {
	const raw = useRaw()
	return (
		<div className={styles.workspace}>
			<TlaIconWrapper data-size="m">
				<TlaIcon className="tla-tldraw-sidebar-icon" icon="tldraw" />
			</TlaIconWrapper>
			<div className={classNames(styles.label, 'tla-text_ui__title')}>{raw('tldraw')}</div>
			<button className={styles.linkButton} />
		</div>
	)
}

function TlaSidebarCreateFileButton() {
	const app = useApp()
	const navigate = useNavigate()

	const handleSidebarCreate = useCallback(() => {
		const file = app.createFile()

		navigate(getFileUrl(file.id), { state: { isCreateMode: true } })
	}, [app, navigate])

	return (
		<button className={styles.create} onClick={handleSidebarCreate}>
			<TlaIcon icon="edit-strong" />
		</button>
	)
}

function TlaSidebarUserLink() {
	const app = useApp()

	const user = useValue(
		'auth',
		() => {
			return app.getCurrentUser()
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
				<div className={styles.label}>{user.name}</div>
				<button className={styles.linkMenu}>
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
			const { auth, createdAt: sessionStart } = getLocalSessionState()
			if (!auth) return false

			return app.getUserRecentFiles(sessionStart)
		},
		[app]
	)

	if (!results) throw Error('Could not get files')

	// split the files into today, yesterday, this week, this month, and then by month
	const day = 1000 * 60 * 60 * 24
	const todayFiles: RecentFile[] = []
	const yesterdayFiles: RecentFile[] = []
	const thisWeekFiles: RecentFile[] = []
	const thisMonthFiles: RecentFile[] = []

	// todo: order by month
	const olderFiles: RecentFile[] = []

	const now = Date.now()

	for (const item of results) {
		const { date } = item
		if (date > now - day * 1) {
			todayFiles.push(item)
		} else if (date > now - day * 2) {
			yesterdayFiles.push(item)
		} else if (date > now - day * 7) {
			thisWeekFiles.push(item)
		} else if (date > now - day * 30) {
			thisMonthFiles.push(item)
		} else {
			olderFiles.push(item)
		}
	}

	return (
		<>
			{todayFiles.length ? <TlaSidebarFileSection title={'Today'} items={todayFiles} /> : null}
			{yesterdayFiles.length ? (
				<TlaSidebarFileSection title={'Yesterday'} items={yesterdayFiles} />
			) : null}
			{thisWeekFiles.length ? (
				<TlaSidebarFileSection title={'This week'} items={thisWeekFiles} />
			) : null}
			{thisMonthFiles.length ? (
				<TlaSidebarFileSection title={'This month'} items={thisMonthFiles} />
			) : null}
			{olderFiles.length ? <TlaSidebarFileSection title={'This year'} items={olderFiles} /> : null}
		</>
	)
}

function TlaSidebarFileSection({ title, items }: { title: string; items: RecentFile[] }) {
	return (
		<div className={styles.section}>
			<TlaSpacer height="8" />
			<div className={classNames(styles.sectionTitle, 'tla-text_ui__medium')}>{title}</div>
			{items.map((item) => (
				<TlaSidebarFileLink key={'recent_' + item.file.id} item={item} />
			))}
		</div>
	)
}

function TlaSidebarFileLink({ item }: { item: RecentFile }) {
	const { file, isOwnFile } = item
	const { fileSlug } = useParams()
	const isActive = TldrawAppFileRecordType.createId(fileSlug) === file.id
	return (
		<div className={classNames(styles.link, styles.hoverable)} data-active={isActive}>
			<div className={styles.linkContent}>
				<div className={classNames(styles.label, 'tla-text_ui__regular')}>
					{TldrawApp.getFileName(file)} {isOwnFile ? '' : '(Guest)'}
				</div>
			</div>
			<Link to={getFileUrl(file.id)} className={styles.linkButton} />
			<TlaSidebarFileLinkMenu fileId={file.id} />
		</div>
	)
}

/* ---------------------- Menu ---------------------- */

function TlaSidebarFileLinkMenu({ fileId }: { fileId: TldrawAppFile['id'] }) {
	return (
		<TlaFileMenu fileId={fileId} source="sidebar">
			<button className={styles.linkMenu}>
				<TlaIcon icon="dots-vertical-strong" />
			</button>
		</TlaFileMenu>
	)
}

export function TlaSidebarToggle() {
	return (
		<button
			className={styles.toggle}
			data-mobile={false}
			data-testid="tla-sidebar-toggle"
			onClick={() => updateLocalSessionState((s) => ({ isSidebarOpen: !s.isSidebarOpen }))}
		>
			<TlaIcon icon="sidebar" />
		</button>
	)
}

export function TlaSidebarToggleMobile() {
	return (
		<button
			className={styles.toggle}
			data-mobile={true}
			data-testid="tla-sidebar-toggle-mobile"
			onClick={() =>
				updateLocalSessionState((s) => ({ isSidebarOpenMobile: !s.isSidebarOpenMobile }))
			}
		>
			<TlaIcon icon="sidebar" />
		</button>
	)
}

interface RecentFile {
	file: TldrawAppFile
	date: number
	isOwnFile: boolean
}
