import { SignedIn, UserButton } from '@clerk/clerk-react'
import { TldrawAppFile, TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { useCallback } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
import { TldrawApp } from '../../utils/TldrawApp'
import { getFileUrl } from '../../utils/urls'
import { TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaIcon, TlaIconWrapper } from '../TlaIcon/TlaIcon'
import { TlaSpacer } from '../TlaSpacer/TlaSpacer'
import styles from './sidebar.module.css'

export function TlaSidebar() {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])
	const isSidebarOpenMobile = useValue(
		'sidebar open mobile',
		() => app.getSessionState().isSidebarOpenMobile,
		[app]
	)

	const handleOverlayClick = useCallback(() => {
		app.toggleSidebarMobile()
	}, [app])

	return (
		<>
			<button
				className={styles.sidebarOverlayMobile}
				data-visiblemobile={isSidebarOpenMobile}
				onClick={handleOverlayClick}
			/>
			<div
				className={styles.sidebar}
				data-visible={isSidebarOpen}
				data-visiblemobile={isSidebarOpenMobile}
			>
				<div className={styles.top}>
					<TlaSidebarWorkspaceLink />
					<TlaSidebarCreateFileButton />
				</div>
				<div className={styles.content}>
					<TlaSidebarRecentFiles />
				</div>
				<div className={styles.bottom}>
					<SignedIn>
						<div className={styles.userButton}>
							<UserButton />
						</div>
					</SignedIn>
					<TlaSidebarUserLink />
				</div>
			</div>
		</>
	)
}

function TlaSidebarWorkspaceLink() {
	const raw = useRaw()
	return (
		<div className={styles.workspace}>
			<TlaIconWrapper data-size="m">
				<TlaIcon icon="tldraw" />
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
		const { auth } = app.getSessionState()
		if (!auth) return false

		const id = TldrawAppFileRecordType.createId()
		app.store.put([
			TldrawAppFileRecordType.create({
				id,
				owner: auth.userId,
			}),
		])
		navigate(getFileUrl(id))
	}, [app, navigate])

	return (
		<button className={styles.create} onClick={handleSidebarCreate}>
			<TlaIcon icon="edit-strong" />
		</button>
	)
}

function TlaSidebarUserLink() {
	const app = useApp()

	const result = useValue(
		'auth',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			const user = app.store.get(auth.userId)!
			return {
				auth,
				user,
			}
		},
		[app]
	)

	const location = useLocation()

	if (!result) throw Error('Could not get user')

	return (
		<div className={classNames(styles.user, styles.hoverable, 'tla-text_ui__regular')}>
			<div className={styles.label}>{result.user.name}</div>
			{/* <Link className="__link-button" to={getUserUrl(result.auth.userId)} /> */}
			<Link className={styles.linkButton} to={'/profile'} state={{ background: location }} />
			<Link className={styles.linkMenu} to={'/debug'} state={{ background: location }}>
				<TlaIcon icon="dots-vertical-strong" />
			</Link>
		</div>
	)
}

function TlaSidebarRecentFiles() {
	const app = useApp()
	const results = useValue(
		'recent user files',
		() => {
			const { auth, createdAt: sessionStart } = app.getSessionState()
			if (!auth) return false

			return app.getUserRecentFiles(auth.userId, sessionStart)
		},
		[app]
	)

	if (!results) throw Error('Could not get files')

	// split the files into today, yesterday, this week, this month, and then by month
	const day = 1000 * 60 * 60 * 24
	const todayFiles: TldrawAppFile[] = []
	const yesterdayFiles: TldrawAppFile[] = []
	const thisWeekFiles: TldrawAppFile[] = []
	const thisMonthFiles: TldrawAppFile[] = []

	// todo: order by month
	const olderFiles: TldrawAppFile[] = []

	const now = Date.now()

	for (const item of results) {
		const { date, file } = item
		if (date > now - day * 1) {
			todayFiles.push(file)
		} else if (date > now - day * 2) {
			yesterdayFiles.push(file)
		} else if (date > now - day * 7) {
			thisWeekFiles.push(file)
		} else if (date > now - day * 30) {
			thisMonthFiles.push(file)
		} else {
			olderFiles.push(file)
		}
	}

	return (
		<>
			{todayFiles.length ? <TlaSidebarFileSection title={'Today'} files={todayFiles} /> : null}
			{yesterdayFiles.length ? (
				<TlaSidebarFileSection title={'Yesterday'} files={yesterdayFiles} />
			) : null}
			{thisWeekFiles.length ? (
				<TlaSidebarFileSection title={'This week'} files={thisWeekFiles} />
			) : null}
			{thisMonthFiles.length ? (
				<TlaSidebarFileSection title={'This month'} files={thisMonthFiles} />
			) : null}
			{olderFiles.length ? <TlaSidebarFileSection title={'This year'} files={olderFiles} /> : null}
		</>
	)
}

function TlaSidebarFileSection({ title, files }: { title: string; files: TldrawAppFile[] }) {
	return (
		<div className={styles.section}>
			<TlaSpacer height="8" />
			<div className={classNames(styles.sectionTitle, 'tla-text_ui__medium')}>{title}</div>
			{files.map((file) => (
				<TlaSidebarFileLink key={'recent_' + file.id} file={file} />
			))}
		</div>
	)
}

function TlaSidebarFileLink({ file }: { file: TldrawAppFile }) {
	const { id } = file
	const { fileSlug } = useParams()
	const isActive = TldrawAppFileRecordType.createId(fileSlug) === id
	console.log('file url', getFileUrl(id), fileSlug)
	return (
		<div className={classNames(styles.link, styles.hoverable)} data-active={isActive}>
			<div className={styles.linkContent}>
				<div className={classNames(styles.label, 'tla-text_ui__regular')}>
					{TldrawApp.getFileName(file)}
				</div>
			</div>
			<Link to={getFileUrl(id)} className={styles.linkButton} />
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
	const app = useApp()
	return (
		<button className={styles.toggle} data-mobile={false} onClick={() => app.toggleSidebar()}>
			<TlaIcon icon="sidebar" />
		</button>
	)
}

export function TlaSidebarToggleMobile() {
	const app = useApp()
	return (
		<button className={styles.toggle} data-mobile={true} onClick={() => app.toggleSidebarMobile()}>
			<TlaIcon icon="sidebar" />
		</button>
	)
}
