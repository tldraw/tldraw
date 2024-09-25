import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import { useCallback } from 'react'
import { Link, useLocation, useMatch, useNavigate, useParams } from 'react-router-dom'
import { TldrawUiButton, TldrawUiButtonLabel, TldrawUiDropdownMenuTrigger, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useFileCollaborators } from '../../hooks/useFileCollaborators'
import { useFlags } from '../../hooks/useFlags'
import { useWorkspace } from '../../hooks/useWorkspace'
import { TldrawApp } from '../../utils/TldrawApp'
import {
	TldrawAppFile,
	TldrawAppFileId,
	TldrawAppFileRecordType,
} from '../../utils/schema/TldrawAppFile'
import { TldrawAppGroup, TldrawAppGroupId } from '../../utils/schema/TldrawAppGroup'
import { TldrawAppUserId } from '../../utils/schema/TldrawAppUser'
import { getCleanId } from '../../utils/tldrawAppSchema'
import { getDebugUrl, getFileUrl, getPageUrl, getUserUrl } from '../../utils/urls'
import { TlaAvatar } from '../TlaAvatar'
import { TlaIcon } from '../TlaIcon'
import { TlaSpacer } from '../TlaSpacer'

export function TlaSidebar() {
	return (
		<div className="tla-sidebar">
			<div className="tla-sidebar__top">
				<TlaSidebarWorkspaceLink />
				<TlaSidebarCreateFileButton />
			</div>
			<div className="tla-sidebar__content">
				<TlaSidebarLinks />
				<TlaSidebarTabs />
				<TlaSidebarActiveTabContent />
			</div>
			<div className="tla-sidebar__bottom">
				<TlaSidebarUserLink />
			</div>
		</div>
	)
}

function TlaSidebarWorkspaceLink() {
	const workspace = useWorkspace()
	if (!workspace) throw Error('Workspace not found')

	return (
		<div className="tla-sidebar__workspace">
			<div className="tla-icon_wrapper" data-size="m">
				<TlaIcon icon={workspace.avatar} />
			</div>
			<div className="tla-sidebar__label tla-text_ui__title">{workspace.name}</div>
			<button className="tla-sidebar__link-button" />
			{/* <button className="tla-sidebar__link-menu">
				<TlaIcon icon="dots-vertical-strong" />
			</button> */}
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
				workspaceId: auth.workspaceId,
				owner: auth.userId,
			}),
		])
		navigate(getFileUrl(auth.workspaceId, id))
	}, [app, navigate])

	return (
		<button className="tla-sidebar__create tla-icon_wrapper" onClick={handleSidebarCreate}>
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
				to={getUserUrl(result.auth.userId)}
				state={{ background: location }}
			/>
			<Link
				className="tla-sidebar__link-menu"
				to={getDebugUrl(result.auth.workspaceId)}
				state={{ background: location }}
			>
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

/* ------------------- Main links ------------------- */

const SIDEBAR_MAIN_LINKS = [
	{
		id: 0,
		icon: 'doc-strong',
		label: 'Drafts',
		href: 'drafts',
	},
	{
		id: 1,
		icon: 'star-strong',
		label: 'Starred',
		href: 'stars',
	},
	{
		id: 2,
		icon: 'link-strong',
		label: 'Shared with me',
		href: 'shared',
	},
	{
		id: 3,
		icon: 'group-strong',
		label: 'Groups',
		href: 'groups',
	},
]

type SideBarMainLink = (typeof SIDEBAR_MAIN_LINKS)[number]

function TlaSidebarLinks() {
	const flags = useFlags()
	if (!flags.links) return null

	return (
		<>
			{flags.drafts && <TlaSidebarMainLink {...SIDEBAR_MAIN_LINKS[0]} />}
			{flags.starred && <TlaSidebarMainLink {...SIDEBAR_MAIN_LINKS[1]} />}
			{flags.shared && <TlaSidebarMainLink {...SIDEBAR_MAIN_LINKS[2]} />}
			{flags.groups && <TlaSidebarMainLink {...SIDEBAR_MAIN_LINKS[3]} />}
		</>
	)
}

function TlaSidebarMainLink({ icon, label, href }: SideBarMainLink) {
	const app = useApp()
	const workspaceId = useValue(
		'workspaceId',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			return auth.workspaceId
		},
		[app]
	)
	if (!workspaceId) throw Error('Workspace not found')

	const match = useMatch(`/q/w/:workspaceId/${href}`)

	return (
		<div
			className="tla-sidebar__main-link tla-text_ui__regular tla-hoverable"
			data-active={!!match}
		>
			<div className="tla-icon_wrapper">
				<TlaIcon icon={icon} />
			</div>
			<Link className="tla-sidebar__link-button" to={getPageUrl(workspaceId, href)} />
			<div className="tla-sidebar__label">{label}</div>
		</div>
	)
}

/* ---------------------- Tabs ---------------------- */

function TlaSidebarTabs() {
	const app = useApp()
	const flags = useFlags()
	const sidebarActiveTab = useValue(
		'sidebar active tab',
		() => app.getSessionState().sidebarActiveTab,
		[app]
	)

	if (!flags.tabs) return null

	return (
		<>
			{flags.links && <TlaSpacer height="20" />}
			<div className="tla-sidebar__tabs">
				{sidebarActiveTab === 'groups' ? (
					<TlaSidebarCreateGroupButton />
				) : (
					<TlaSidebarCreateFileButton />
				)}
				<div className="tla-sidebar__line" />
				{flags.draftsTab && (
					<button
						className="tla-sidebar__tabs_tab tla-text_ui__regular"
						data-active={sidebarActiveTab === 'drafts'}
						onClick={() => app.setSidebarActiveTab('drafts')}
					>
						Drafts
					</button>
				)}
				{flags.recentTab && (
					<button
						className="tla-sidebar__tabs_tab tla-text_ui__regular"
						data-active={sidebarActiveTab === 'recent'}
						onClick={() => app.setSidebarActiveTab('recent')}
					>
						Recent
					</button>
				)}
				{flags.starredTab && (
					<button
						className="tla-sidebar__tabs_tab tla-text_ui__regular"
						data-active={sidebarActiveTab === 'starred'}
						onClick={() => app.setSidebarActiveTab('starred')}
					>
						Starred
					</button>
				)}
				{flags.sharedTab && (
					<button
						className="tla-sidebar__tabs_tab tla-text_ui__regular"
						data-active={sidebarActiveTab === 'shared'}
						onClick={() => app.setSidebarActiveTab('shared')}
					>
						Shared
					</button>
				)}
				{flags.groupsTab && (
					<button
						className="tla-sidebar__tabs_tab tla-text_ui__regular"
						data-active={sidebarActiveTab === 'groups'}
						onClick={() => app.setSidebarActiveTab('groups')}
					>
						Groups
					</button>
				)}
			</div>
		</>
	)
}

function TlaSidebarCreateGroupButton() {
	const app = useApp()
	const navigate = useNavigate()

	return (
		<button
			className="tla-sidebar__create tla-icon_wrapper"
			onClick={() => {
				const { auth } = app.getSessionState()
				if (!auth) return false
				const id = TldrawAppFileRecordType.createId()
				app.store.put([
					TldrawAppFileRecordType.create({
						id,
						workspaceId: auth.workspaceId,
						owner: auth.userId,
					}),
				])
				navigate(getFileUrl(auth.workspaceId, id))
			}}
		>
			<TlaIcon icon="plus-strong" />
		</button>
	)
}

function TlaSidebarActiveTabContent() {
	const app = useApp()
	const sidebarActiveTab = useValue(
		'sidebar active tab',
		() => {
			return app.getSessionState().sidebarActiveTab
		},
		[app]
	)

	if (sidebarActiveTab === 'drafts') {
		return <TlaSidebarDraftFiles />
	}

	if (sidebarActiveTab === 'recent') {
		return <TlaSidebarRecentFiles />
	}

	if (sidebarActiveTab === 'shared') {
		return <TlaSidebarSharedFiles />
	}

	if (sidebarActiveTab === 'starred') {
		return <TlaSidebarStarredFiles />
	}

	if (sidebarActiveTab === 'groups') {
		return <TlaSidebarGroups />
	}

	throw Error('unknown tab')
}

function TlaSidebarDraftFiles() {
	const app = useApp()
	const results = useValue(
		'recent user files',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			return app
				.getUserOwnFiles(auth.userId, auth.workspaceId)
				.sort((a, b) => b.createdAt - a.createdAt)
		},
		[app]
	)

	if (!results) throw Error('Could not get files')

	return (
		<div className="tla-sidebar__section">
			<TlaSpacer height="20" />
			{results.map((file) => (
				<TlaSidebarFileLink key={'recent_' + file.id} file={file} />
			))}
		</div>
	)
}

function TlaSidebarStarredFiles() {
	const app = useApp()
	const results = useValue(
		'recent user files',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			return app
				.getUserStarredFiles(auth.userId, auth.workspaceId)
				.sort((a, b) => b.createdAt - a.createdAt)
		},
		[app]
	)

	if (!results) throw Error('Could not get files')

	return (
		<div className="tla-sidebar__section">
			<TlaSpacer height="20" />
			{results.map((file) => (
				<TlaSidebarFileLink key={'recent_' + file.id} file={file} />
			))}
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

			return app.getUserRecentFiles(auth.userId, auth.workspaceId, sessionStart)
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

function TlaSidebarSharedFiles() {
	const app = useApp()
	const results = useValue(
		'recent user files',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			return app
				.getUserSharedFiles(auth.userId, auth.workspaceId)
				.sort((a, b) => b.createdAt - a.createdAt)
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
	const olderFiles: TldrawAppFile[] = []

	for (const file of results) {
		const date = new Date(file.createdAt)
		if (date > new Date(Date.now() - day * 1)) {
			todayFiles.push(file)
		} else if (date > new Date(Date.now() - day * 2)) {
			yesterdayFiles.push(file)
		} else if (date > new Date(Date.now() - day * 7)) {
			thisWeekFiles.push(file)
		} else if (date > new Date(Date.now() - day * 30)) {
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

/* --------------------- Groups --------------------- */

function TlaSidebarGroups() {
	const app = useApp()
	const groups = useValue(
		'user groups',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			return app.getUserGroups(auth.userId, auth.workspaceId)
		},
		[app]
	)
	if (!groups) throw Error('Could not get groups')

	return (
		<>
			{groups.map((group) => (
				<TlaSidebarGroup key={group.id} {...group} />
			))}
			{groups.length === 0 ? (
				<div className="tla-sidebar__empty">
					<TlaSpacer height="20" />
					<div className="tla-sidebar__link tla-hoverable" data-active={false}>
						<div className="tla-sidebar__link-content">
							<div className="tla-sidebar__label tla-text_ui__regular">Create a new group</div>
						</div>
						<button className="tla-sidebar__link-button" />
						<button className="tla-sidebar__link-menu">
							<TlaIcon icon="dots-vertical-strong" />
						</button>
					</div>
				</div>
			) : null}
		</>
	)
}

function TlaSidebarGroup({ id: groupId, name }: TldrawAppGroup) {
	const app = useApp()
	const files = useValue(
		'group files',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			return app.getGroupFiles(groupId, auth.workspaceId)
		},
		[app, groupId]
	)
	if (!files) throw Error('Could not get files')

	return (
		<div className="tla-sidebar__section">
			<TlaSpacer height="20" />
			<div className="tla-sidebar__section_title tla-text_ui__section">
				{/* <TlaGroupAvatar /> */}
				{name}
				<TlaSidebarCreateGroupFileButton groupId={groupId} />
			</div>
			{files.map((file) => (
				<TlaSidebarFileLink key={'group_' + file.id} file={file} />
			))}
		</div>
	)
}

function TlaSidebarCreateGroupFileButton({ groupId }: { groupId: TldrawAppGroupId }) {
	const app = useApp()
	const navigate = useNavigate()

	return (
		<button
			className="tla-sidebar__create tla-icon_wrapper"
			onClick={() => {
				const { auth } = app.getSessionState()
				if (!auth) return false
				const id = TldrawAppFileRecordType.createId()
				app.store.put([
					TldrawAppFileRecordType.create({
						id,
						workspaceId: auth.workspaceId,
						owner: groupId,
					}),
				])
				navigate(getFileUrl(auth.workspaceId, id))
			}}
		>
			<TlaIcon icon="edit" />
		</button>
	)
}

/* -------------------- File link ------------------- */

function TlaSidebarFileLink({ file }: { file: TldrawAppFile }) {
	const { workspaceId, id } = file
	const { fileId } = useParams()
	const isActive = fileId === getCleanId(id)
	const flags = useFlags()
	return (
		<div className="tla-sidebar__link tla-hoverable" data-active={isActive}>
			<div className="tla-sidebar__link-content">
				<TlaSharedFileOwner fileId={file.id} />
				<div className="tla-sidebar__label tla-text_ui__regular">{TldrawApp.getFileName(file)}</div>
				{flags.groups && <TlaCollaborators fileId={file.id} />}
			</div>
			<Link to={getFileUrl(workspaceId, id)} className="tla-sidebar__link-button" />
			<TlaSidebarFileLinkMenu fileId={file.id} />
		</div>
	)
}

function TlaSharedFileOwner({ fileId }: { fileId: TldrawAppFileId }) {
	const app = useApp()

	const owner = useValue(
		'file owner',
		() => {
			const session = app.getSessionState()
			if (!session.auth) throw Error('No auth')

			const { userId } = session.auth

			const file = app.store.get(fileId)
			if (!file) throw Error('File not found')

			if (file.owner === userId) return null

			if (file.owner === 'temporary') throw Error('temporary file')

			return app.store.get(file.owner)
		},
		[fileId]
	)

	if (!owner) return null

	return (
		<div className="tla-collaborators">
			<TlaCollaborator key={owner.id} collaboratorId={owner.id} />
		</div>
	)
}

function TlaCollaborators({ fileId }: { fileId: TldrawAppFileId }) {
	const collaborators = useFileCollaborators(fileId)

	if (collaborators.length === 0) return null

	return (
		<div className="tla-collaborators">
			{collaborators.map((userId) => (
				<TlaCollaborator key={userId} collaboratorId={userId} />
			))}
		</div>
	)
}

function TlaCollaborator({
	collaboratorId,
}: {
	collaboratorId: TldrawAppUserId | TldrawAppGroupId
}) {
	const app = useApp()
	const collaborator = useValue(
		'collaborator',
		() => {
			const collaborator = app.store.get(collaboratorId)
			if (!collaborator) throw Error('no user')
			return collaborator
		},
		[app, collaboratorId]
	)
	return (
		<div
			className="tla-collaborator tla-text_ui__tiny"
			style={{ backgroundColor: collaborator.color }}
		>
			{collaborator.name[0]}
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
