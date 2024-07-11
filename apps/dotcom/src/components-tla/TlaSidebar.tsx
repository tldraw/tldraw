import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { useFileCollaborators } from '../tla-hooks/useFileCollaborators'
import { useFlags } from '../tla-hooks/useFlags'
import { useWorkspace } from '../tla-hooks/useWorkspace'
import { TldrawApp } from '../utils/tla/TldrawApp'
import {
	TldrawAppFile,
	TldrawAppFileId,
	TldrawAppFileRecordType,
} from '../utils/tla/schema/TldrawAppFile'
import { TldrawAppGroup, TldrawAppGroupId } from '../utils/tla/schema/TldrawAppGroup'
import { TldrawAppUserId } from '../utils/tla/schema/TldrawAppUser'
import { getCleanId } from '../utils/tla/tldrawAppSchema'
import { getDebugUrl, getFileUrl, getPageUrl } from '../utils/tla/urls'
import { TlaAvatar } from './TlaAvatar'
import { TlaIcon } from './TlaIcon'
import { TlaSpacer } from './TlaSpacer'

const SIDEBAR_MAIN_LINKS = [
	{
		id: 0,
		icon: 'doc',
		label: 'Drafts',
		href: 'drafts',
	},
	{
		id: 1,
		icon: 'star',
		label: 'Starred',
		href: 'stars',
	},
	{
		id: 2,
		icon: 'link',
		label: 'Shared with me',
		href: 'shared',
	},
	{
		id: 3,
		icon: 'group',
		label: 'My groups',
		href: 'groups',
	},
]

type SideBarMainLink = (typeof SIDEBAR_MAIN_LINKS)[number]

export function TlaSidebar() {
	const flags = useFlags()
	return (
		<div className="tla_sidebar">
			{/* <SidebarCreateButton /> */}
			<div className="tla_sidebar__top">
				<TlaSidebarWorkspaceLink />
			</div>
			<div className="tla_sidebar__content">
				{flags.drafts && (
					<TlaSidebarMainLink key={SIDEBAR_MAIN_LINKS[0].id} {...SIDEBAR_MAIN_LINKS[0]} />
				)}
				{flags.starred && (
					<TlaSidebarMainLink key={SIDEBAR_MAIN_LINKS[1].id} {...SIDEBAR_MAIN_LINKS[1]} />
				)}
				{flags.shared && (
					<TlaSidebarMainLink key={SIDEBAR_MAIN_LINKS[2].id} {...SIDEBAR_MAIN_LINKS[2]} />
				)}
				{flags.groups && (
					<TlaSidebarMainLink key={SIDEBAR_MAIN_LINKS[3].id} {...SIDEBAR_MAIN_LINKS[3]} />
				)}
				<TlaSidebarTabs />
				<TlaSidebarActiveTabContent />
			</div>
			<div className="tla_sidebar__bottom">
				<TlaSidebarUserLink />
			</div>
		</div>
	)
}

function TlaSidebarCreateFileButton() {
	const app = useApp()
	const navigate = useNavigate()

	return (
		<button
			className="tla_sidebar__create tla_icon_wrapper"
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
			<TlaIcon icon="edit-strong" />
		</button>
	)
}

function TlaSidebarCreateGroupFileButton({ groupId }: { groupId: TldrawAppGroupId }) {
	const app = useApp()
	const navigate = useNavigate()

	return (
		<button
			className="tla_sidebar__create tla_icon_wrapper"
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

function TlaSidebarCreateGroupButton() {
	const app = useApp()
	const navigate = useNavigate()

	return (
		<button
			className="tla_sidebar__create tla_icon_wrapper"
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

function TlaSidebarWorkspaceLink() {
	const workspace = useWorkspace()
	if (!workspace) throw Error('Workspace not found')

	return (
		<div className="tla_sidebar__workspace tla_hoverable">
			<div className="tla_icon_wrapper" data-size="m">
				<TlaIcon icon={workspace.avatar} />
			</div>
			<div className="tla_sidebar__label tla_text_ui__title">{workspace.name}</div>
			<button className="tla_sidebar__link-button" />
			<button className="tla_sidebar__link-menu">
				<TlaIcon icon="dots-vertical" />
			</button>
		</div>
	)
}

function TlaSidebarTabs() {
	const app = useApp()
	const flags = useFlags()
	const sidebarActiveTab = useValue(
		'sidebar active tab',
		() => app.getSessionState().sidebarActiveTab,
		[app]
	)

	return (
		<>
			<TlaSpacer height="20" />
			<div className="tla_sidebar__tabs">
				{sidebarActiveTab === 'recent' ? (
					<TlaSidebarCreateFileButton />
				) : (
					<TlaSidebarCreateGroupButton />
				)}
				<div className="tla_sidebar__line" />
				<button
					className="tla_sidebar__tabs_tab tla_text_ui__regular"
					data-active={sidebarActiveTab === 'recent'}
					onClick={() => {
						app.setSidebarActiveTab('recent')
					}}
				>
					Recent
				</button>
				{flags.groups && (
					<button
						className="tla_sidebar__tabs_tab tla_text_ui__regular"
						data-active={sidebarActiveTab === 'groups'}
						onClick={() => {
							app.setSidebarActiveTab('groups')
						}}
					>
						Groups
					</button>
				)}
			</div>
		</>
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

	if (sidebarActiveTab === 'recent') {
		return <TlaSidebarRecentFiles />
	}

	if (sidebarActiveTab === 'groups') {
		return <TlaSidebarGroups />
	}

	throw Error('unknown tab')
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

	const match = useMatch(`/w/:workspaceId/${href}`)

	return (
		<div
			className="tla_sidebar__main-link tla_text_ui__regular tla_hoverable"
			data-active={!!match}
		>
			<div className="tla_icon_wrapper">
				<TlaIcon icon={icon} />
			</div>
			<Link className="tla_sidebar__link-button" to={getPageUrl(workspaceId, href)} />
			<div className="tla_sidebar__label">{label}</div>
		</div>
	)
}

function TlaSidebarRecentSection({ title, files }: { title: string; files: TldrawAppFile[] }) {
	return (
		<div className="tla_sidebar__section">
			<TlaSpacer height="20" />
			<div className="tla_sidebar__section_title tla_text_ui__section">{title}</div>
			{files.map((file) => (
				<TlaSidebarFileLink key={'recent_' + file.id} file={file} />
			))}
		</div>
	)
}

function TlaSidebarFileLink({ file }: { file: TldrawAppFile }) {
	const { workspaceId, id } = file
	const { fileId } = useParams()
	const isActive = fileId === getCleanId(id)
	const flags = useFlags()
	return (
		<div className="tla_sidebar__link tla_hoverable" data-active={isActive}>
			<div className="tla_sidebar__link-content">
				<div className="tla_sidebar__label tla_text_ui__regular">{TldrawApp.getFileName(file)}</div>
				{flags.groups && <TlaCollaborators fileId={file.id} />}
			</div>
			<Link to={getFileUrl(workspaceId, id)} className="tla_sidebar__link-button" />
			<button className="tla_sidebar__link-menu">
				<TlaIcon icon="dots-vertical" />
			</button>
		</div>
	)
}

function TlaCollaborators({ fileId }: { fileId: TldrawAppFileId }) {
	const collaborators = useFileCollaborators(fileId)

	if (collaborators.length === 0) return null

	return (
		<div className="tla_collaborators">
			{collaborators.map((userId) => (
				<TlaCollaborator key={userId} userId={userId} />
			))}
		</div>
	)
}

function TlaCollaborator({ userId }: { userId: TldrawAppUserId }) {
	const app = useApp()
	const user = useValue(
		'user',
		() => {
			const user = app.getUser(userId)
			if (!user) throw Error('no user')
			return user
		},
		[app, userId]
	)
	return (
		<div className="tla_collaborator tla_text_ui__tiny" style={{ backgroundColor: user.color }}>
			{user.name[0]}
		</div>
	)
}

function TlaSidebarRecentFiles() {
	const app = useApp()
	const results = useValue(
		'recent user files',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			return app
				.getUserFiles(auth.userId, auth.workspaceId)
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
			{todayFiles.length ? <TlaSidebarRecentSection title={'Today'} files={todayFiles} /> : null}
			{yesterdayFiles.length ? (
				<TlaSidebarRecentSection title={'Yesterday'} files={yesterdayFiles} />
			) : null}
			{thisWeekFiles.length ? (
				<TlaSidebarRecentSection title={'This week'} files={thisWeekFiles} />
			) : null}
			{thisMonthFiles.length ? (
				<TlaSidebarRecentSection title={'This month'} files={thisMonthFiles} />
			) : null}
		</>
	)
}

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
				<div className="tla_sidebar__empty">
					<TlaSpacer height="20" />
					<div className="tla_sidebar__link tla_hoverable" data-active={false}>
						<div className="tla_sidebar__link-content">
							<div className="tla_sidebar__label tla_text_ui__regular">Create a new group</div>
						</div>
						<button className="tla_sidebar__link-button" />
						<button className="tla_sidebar__link-menu">
							<TlaIcon icon="dots-vertical" />
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
		<div className="tla_sidebar__section">
			<TlaSpacer height="20" />
			<div className="tla_sidebar__section_title tla_text_ui__section">
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

// function TlaGroupAvatar() {
// 	return <div className="tla_sidebar__group-avatar" />
// }

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
	if (!result) throw Error('Could not get user')

	return (
		<div className="tla_sidebar__user tla_hoverable tla_text_ui__regular">
			<div className="tla_icon_wrapper">
				<TlaAvatar data-size="m" />
			</div>
			<div className="tla_sidebar__label">{result.user.name}</div>
			{/* <Link className="tla_sidebar__link-button" to={getUserUrl(result.auth.userId)} /> */}
			<Link className="tla_sidebar__link-button" to={getDebugUrl(result.auth.workspaceId)} />
			<button
				className="tla_sidebar__link-menu"
				onClick={() => {
					const currentState = app.getSessionState()
					app.setSessionState({
						...currentState,
						theme: currentState.theme === 'light' ? 'dark' : 'light',
					})
				}}
			>
				<TlaIcon icon="dots-vertical" />
			</button>
		</div>
	)
}
