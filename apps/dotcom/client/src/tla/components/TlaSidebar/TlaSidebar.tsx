import { SignedIn, UserButton } from '@clerk/clerk-react'
import { id, tx } from '@instantdb/core'
import classNames from 'classnames'
import { useCallback } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useAuthUser, useDbUserFiles } from '../../hooks/db-hooks'
import { useRaw } from '../../hooks/useRaw'
import { getLocalSessionState, updateLocalSessionState } from '../../providers/SessionProvider'
import { db, getNewFile } from '../../utils/db'
import { TldrawAppFile } from '../../utils/db-schema'
import { getFileUrl } from '../../utils/urls'
import { TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaIcon, TlaIconWrapper } from '../TlaIcon/TlaIcon'
import { TlaSpacer } from '../TlaSpacer/TlaSpacer'
import styles from './sidebar.module.css'

export function TlaSidebar() {
	const isSidebarOpen = useValue('sidebar open', () => getLocalSessionState().isSidebarOpen, [])
	const isSidebarOpenMobile = useValue(
		'sidebar open mobile',
		() => getLocalSessionState().isSidebarOpenMobile,
		[]
	)
	const handleOverlayClick = useCallback(() => {
		updateLocalSessionState((state) => {
			return { ...state, isSidebarOpenMobile: !state.isSidebarOpenMobile }
		})
	}, [])

	// const { onDrop, onDragOver, onDragEnter, onDragLeave, isDraggingOver } = useTldrFileDrop()

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
				// onDropCapture={onDrop}
				// onDragOver={onDragOver}
				// onDragEnter={onDragEnter}
				// onDragLeave={onDragLeave}
				// data-dragging={isDraggingOver}
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
	const navigate = useNavigate()
	const user = useAuthUser()

	const handleSidebarCreate = useCallback(() => {
		const fileId = id()
		db.transact([
			tx.files[fileId].update(getNewFile(user.id)),
			tx.users[user.id].link({ files: fileId }),
		])
		db.queryOnce({ files: { $: { where: { id: fileId } } } }).then(() => {
			navigate(getFileUrl(fileId), { state: { isCreateMode: true } })
		})
	}, [navigate, user.id])

	return (
		<button className={styles.create} onClick={handleSidebarCreate}>
			<TlaIcon icon="edit-strong" />
		</button>
	)
}

function TlaSidebarUserLink() {
	const user = useAuthUser()

	const location = useLocation()

	if (!user) throw Error('Could not get user')

	return (
		<div className={classNames(styles.user, styles.hoverable, 'tla-text_ui__regular')}>
			<div className={styles.label}>{user.email}</div>
			{/* <Link className="__link-button" to={getUserUrl(result.auth.userId)} /> */}
			<Link className={styles.linkButton} to={'/q/profile'} state={{ background: location }} />
			<Link className={styles.linkMenu} to={'/q/debug'} state={{ background: location }}>
				<TlaIcon icon="dots-vertical-strong" />
			</Link>
		</div>
	)
}

function TlaSidebarRecentFiles() {
	const filesResp = useDbUserFiles()

	if (filesResp.isLoading) return null

	if (!filesResp.data?.files) return null

	return <TlaSidebarFileSection title={'Recent'} files={filesResp.data.files} />

	// // split the files into today, yesterday, this week, this month, and then by month
	// const day = 1000 * 60 * 60 * 24
	// const todayFiles: TldrawAppFile[] = []
	// const yesterdayFiles: TldrawAppFile[] = []
	// const thisWeekFiles: TldrawAppFile[] = []
	// const thisMonthFiles: TldrawAppFile[] = []

	// // todo: order by month
	// const olderFiles: TldrawAppFile[] = []

	// const now = Date.now()

	// for (const item of files) {
	// 	const { date, file } = item
	// 	if (date > now - day * 1) {
	// 		todayFiles.push(file)
	// 	} else if (date > now - day * 2) {
	// 		yesterdayFiles.push(file)
	// 	} else if (date > now - day * 7) {
	// 		thisWeekFiles.push(file)
	// 	} else if (date > now - day * 30) {
	// 		thisMonthFiles.push(file)
	// 	} else {
	// 		olderFiles.push(file)
	// 	}
	// }

	// return (
	// 	<>
	// 		{todayFiles.length ? <TlaSidebarFileSection title={'Today'} files={todayFiles} /> : null}
	// 		{yesterdayFiles.length ? (
	// 			<TlaSidebarFileSection title={'Yesterday'} files={yesterdayFiles} />
	// 		) : null}
	// 		{thisWeekFiles.length ? (
	// 			<TlaSidebarFileSection title={'This week'} files={thisWeekFiles} />
	// 		) : null}
	// 		{thisMonthFiles.length ? (
	// 			<TlaSidebarFileSection title={'This month'} files={thisMonthFiles} />
	// 		) : null}
	// 		{olderFiles.length ? <TlaSidebarFileSection title={'This year'} files={olderFiles} /> : null}
	// 	</>
	// )
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
	const { fileSlug } = useParams()
	const isActive = fileSlug === file.id
	return (
		<div className={classNames(styles.link, styles.hoverable)} data-active={isActive}>
			<div className={styles.linkContent}>
				<div className={classNames(styles.label, 'tla-text_ui__regular')}>{file.name}</div>
			</div>
			<Link to={getFileUrl(file.id)} className={styles.linkButton} />
			<TlaSidebarFileLinkMenu fileId={file.id} />
		</div>
	)
}

// /* ---------------------- Menu ---------------------- */

function TlaSidebarFileLinkMenu({ fileId }: { fileId: string }) {
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
			onClick={() => {
				updateLocalSessionState((s) => ({ ...s, isSidebarOpen: !s.isSidebarOpen }))
			}}
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
			onClick={() => {
				updateLocalSessionState((s) => ({ ...s, isSidebarOpenMobile: !s.isSidebarOpenMobile }))
			}}
		>
			<TlaIcon icon="sidebar" />
		</button>
	)
}
