import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import { useCallback } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { TldrawUiButton, TldrawUiButtonLabel, TldrawUiDropdownMenuTrigger, useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TldrawApp } from '../utils/TldrawApp'
import { TldrawAppFile, TldrawAppFileRecordType } from '../utils/schema/TldrawAppFile'
import { getCleanId } from '../utils/tldrawAppSchema'
import { getFileUrl } from '../utils/urls'
import { TlaAvatar } from './TlaAvatar/TlaAvatar'
import { TlaIcon, TlaIconWrapper } from './TlaIcon/TlaIcon'
import { TlaSpacer } from './TlaSpacer/TlaSpacer'

export function TlaSidebar() {
	return (
		<div className="tla-sidebar">
			<div className="tla-sidebar__top">
				<TlaSidebarWorkspaceLink />
				<TlaSidebarCreateFileButton />
			</div>
			<div className="tla-sidebar__content">
				<TlaSidebarRecentFiles />
			</div>
			<div className="tla-sidebar__bottom">
				<TlaSidebarUserLink />
			</div>
		</div>
	)
}

function TlaSidebarWorkspaceLink() {
	return (
		<div className="tla-sidebar__workspace">
			<TlaIconWrapper data-size="m">
				<TlaIcon icon="tldraw" />
			</TlaIconWrapper>
			<div className="tla-sidebar__label tla-text_ui__title">tldraw</div>
			<button className="tla-sidebar__link-button" />
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
		<button className="tla-sidebar__create" onClick={handleSidebarCreate}>
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
		<div className="tla-sidebar__user tla-hoverable tla-text_ui__regular">
			<div className="tla-icon_wrapper">
				<TlaAvatar size="s" />
			</div>
			<div className="tla-sidebar__label">{result.user.name}</div>
			{/* <Link className="tla-sidebar__link-button" to={getUserUrl(result.auth.userId)} /> */}
			<Link
				className="tla-sidebar__link-button"
				to={'/q/profile'}
				state={{ background: location }}
			/>
			<Link className="tla-sidebar__link-menu" to={'/q/debug'} state={{ background: location }}>
				<TlaIcon icon="dots-vertical-strong" />
			</Link>
		</div>
	)
}

// function TlaSidebarCreateFileLink() {
// 	const app = useApp()
// 	const navigate = useNavigate()
// 	return (
// 		<div className="tla-sidebar__link tla-hoverable">
// 			<div className="tla-sidebar__link-content">
// 				<div className="tla-sidebar__label tla-text_ui__regular">New file</div>
// 			</div>
// 			<button
// 				className="tla-sidebar__link-button"
// 				onClick={() => {
// 					const { auth } = app.getSessionState()
// 					if (!auth) return false
// 					const id = TldrawAppFileRecordType.createId()
// 					app.store.put([
// 						TldrawAppFileRecordType.create({
// 							id,
// 							workspaceId: auth.workspaceId,
// 							owner: auth.userId,
// 						}),
// 					])
// 					navigate(getFileUrl(auth.workspaceId, id))
// 				}}
// 			/>
// 			<div className="tla-sidebar__create tla-icon_wrapper" style={{ height: '100%' }}>
// 				<TlaIcon icon="edit-strong" />
// 			</div>
// 		</div>
// 	)
// }

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
			{olderFiles.length ? (
				<TlaSidebarFileSection title={'This year'} files={thisMonthFiles} />
			) : null}
		</>
	)
}

function TlaSidebarFileSection({ title, files }: { title: string; files: TldrawAppFile[] }) {
	return (
		<div className="tla-sidebar__section">
			{/* <TlaSpacer height="20" /> */}
			<TlaSpacer height="8" />
			<div className="tla-sidebar__section_title tla-text_ui__medium">{title}</div>
			{files.map((file) => (
				<TlaSidebarFileLink key={'recent_' + file.id} file={file} />
			))}
		</div>
	)
}

function TlaSidebarFileLink({ file }: { file: TldrawAppFile }) {
	const { id } = file
	const { fileId } = useParams()
	const isActive = fileId === getCleanId(id)
	return (
		<div className="tla-sidebar__link tla-hoverable" data-active={isActive}>
			<div className="tla-sidebar__link-content">
				<div className="tla-sidebar__label tla-text_ui__regular">{TldrawApp.getFileName(file)}</div>
			</div>
			<Link to={getFileUrl(id)} className="tla-sidebar__link-button" />
			<TlaSidebarFileLinkMenu fileId={file.id} />
		</div>
	)
}

/* ---------------------- Menu ---------------------- */

function TlaSidebarFileLinkMenu(_props: { fileId: TldrawAppFile['id'] }) {
	// const app = useApp()

	const handleCopyLinkClick = useCallback(() => {
		// copy file url
	}, [])

	const handleRenameLinkClick = useCallback(() => {
		// open rename dialog
	}, [])

	const handleDuplicateLinkClick = useCallback(() => {
		// duplicate file
	}, [])

	const handleStarLinkClick = useCallback(() => {
		// toggle star file
	}, [])

	const handleDeleteLinkClick = useCallback(() => {
		// toggle star file
	}, [])

	return (
		<DropdownPrimitive.Root dir="ltr" modal={false}>
			<TldrawUiDropdownMenuTrigger>
				<button className="tla-sidebar__link-menu">
					<TlaIcon icon="dots-vertical-strong" />
				</button>
			</TldrawUiDropdownMenuTrigger>
			<DropdownPrimitive.Content
				className="tlui-menu tla-text_ui__medium"
				data-size="small"
				side="bottom"
				align="start"
				collisionPadding={4}
				alignOffset={0}
				sideOffset={0}
			>
				<div className="tlui-menu__group">
					<TlaMenuButton label="Copy link" onClick={handleCopyLinkClick} />
					<TlaMenuButton label="Rename" onClick={handleRenameLinkClick} />
					<TlaMenuButton label="Duplicate" onClick={handleDuplicateLinkClick} />
					<TlaMenuButton label="Star" onClick={handleStarLinkClick} />
				</div>
				<div className="tlui-menu__group">
					<TlaMenuButton label="Delete" onClick={handleDeleteLinkClick} />
				</div>
			</DropdownPrimitive.Content>
		</DropdownPrimitive.Root>
	)
}

function TlaMenuButton({ label, onClick }: { label: string; onClick(): void }) {
	return (
		<DropdownPrimitive.DropdownMenuItem asChild>
			<TldrawUiButton type="menu" onClick={onClick}>
				<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
			</TldrawUiButton>
		</DropdownPrimitive.DropdownMenuItem>
	)
}
