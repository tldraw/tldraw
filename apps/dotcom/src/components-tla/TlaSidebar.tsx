import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { useWorkspace } from '../tla-hooks/useWorkspace'
import { TldrawAppFile, TldrawAppFileRecordType } from '../utils/tla/schema/TldrawAppFile'
import { TldrawAppGroup } from '../utils/tla/schema/TldrawAppGroup'
import { TldrawAppUser } from '../utils/tla/schema/TldrawAppUser'
import { getCleanId } from '../utils/tla/tldrawApp'
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
]

type SideBarMainLink = (typeof SIDEBAR_MAIN_LINKS)[number]

export function TlaSidebar() {
	return (
		<div className="tla_sidebar">
			<SidebarCreateButton />
			<div className="tla_sidebar__top">
				<SidebarWorkspaceLink />
			</div>
			<div className="tla_sidebar__content">
				{SIDEBAR_MAIN_LINKS.map((link) => (
					<SidebarMainLink key={link.id} {...link} />
				))}
				<TlaSpacer height="20" />
				<SidebarTabs />
				<SidebarActiveTabContent />
			</div>
			<div className="tla_sidebar__bottom">
				<SidebarUserLink />
			</div>
		</div>
	)
}

function SidebarCreateButton() {
	const app = useApp()
	const navigate = useNavigate()

	return (
		<button
			className="tla_sidebar__create tla_icon_wrapper"
			onClick={() => {
				const session = app.getSession()!
				const id = TldrawAppFileRecordType.createId()
				app.store.put([
					TldrawAppFileRecordType.create({
						id,
						workspaceId: session.workspaceId,
						owner: session.userId,
					}),
				])
				navigate(`/${getCleanId(session.workspaceId)}/f/${getCleanId(id)}`)
			}}
		>
			<TlaIcon icon="edit-strong" />
		</button>
	)
}

function SidebarWorkspaceLink() {
	const workspace = useWorkspace()
	if (!workspace) throw Error('Workspace not found')

	return (
		<div className="tla_sidebar__workspace tla_sidebar__hoverable">
			<div className="tla_icon_wrapper" data-size="m">
				<TlaIcon icon={workspace.avatar} />
			</div>
			<div className="tla_sidebar__label">{workspace.name}</div>
			<button className="tla_sidebar__link-button" />
			<button className="tla_sidebar__link-menu">
				<TlaIcon icon="more" />
			</button>
		</div>
	)
}

function SidebarTabs() {
	const app = useApp()
	const sidebarActiveTab = useValue(
		'sidebar active tab',
		() => {
			return app.getUi().sidebarActiveTab
		},
		[app]
	)

	return (
		<div className="tla_sidebar__tabs">
			<div className="tla_sidebar__line" />
			<button
				className="tla_sidebar__tabs_tab"
				data-active={sidebarActiveTab === 'recent'}
				onClick={() => {
					app.setSidebarActiveTab('recent')
				}}
			>
				Recent
			</button>
			<button
				className="tla_sidebar__tabs_tab"
				data-active={sidebarActiveTab === 'groups'}
				onClick={() => {
					app.setSidebarActiveTab('groups')
				}}
			>
				Groups
			</button>
		</div>
	)
}

function SidebarActiveTabContent() {
	const app = useApp()
	const sidebarActiveTab = useValue(
		'sidebar active tab',
		() => {
			return app.getUi().sidebarActiveTab
		},
		[app]
	)

	if (sidebarActiveTab === 'recent') {
		return <SidebarRecentFiles />
	}

	if (sidebarActiveTab === 'groups') {
		return <SidebarGroups />
	}

	throw Error('unknown tab')
}

function SidebarMainLink({ icon, label, href }: SideBarMainLink) {
	const app = useApp()
	const workspaceId = useValue(
		'workspaceId',
		() => {
			return app.getSession()?.workspaceId
		},
		[app]
	)
	if (!workspaceId) throw Error('Workspace not found')

	const match = useMatch(`/:workspaceId/${href}`)

	return (
		<div className="tla_sidebar__main-link tla_sidebar__hoverable" data-active={!!match}>
			<div className="tla_icon_wrapper">
				<TlaIcon icon={icon} />
			</div>
			<Link className="tla_sidebar__link-button" to={`/${workspaceId.split(':')[1]}/${href}`} />
			<div className="tla_sidebar__label">{label}</div>
		</div>
	)
}

function SidebarRecentSection({ title, files }: { title: string; files: TldrawAppFile[] }) {
	return (
		<div className="tla_sidebar__section">
			<TlaSpacer height="20" />
			<div className="tla_sidebar__section_title">{title}</div>
			{files.map((file) => (
				<SidebarFileLink key={'recent_' + file.id} file={file} />
			))}
		</div>
	)
}

function SidebarFileLink({ file }: { file: TldrawAppFile }) {
	const { workspaceId, id } = file
	const { fileId } = useParams()
	const isActive = fileId === getCleanId(id)
	return (
		<div className="tla_sidebar__section_link tla_sidebar__hoverable" data-active={isActive}>
			<div className="tla_sidebar__label">
				{file.name || new Date(file.createdAt).toLocaleString('en-gb')}
			</div>
			<Link
				to={`/${getCleanId(workspaceId)}/f/${getCleanId(id)}`}
				className="tla_page__grid_item_link"
			/>
			<button className="tla_sidebar__link-menu">
				<TlaIcon icon="more" />
			</button>
		</div>
	)
}

function SidebarRecentFiles() {
	const app = useApp()
	const results = useValue(
		'recent user files',
		() => {
			const session = app.getSession()
			if (!session) return
			return app.getUserFiles(session.userId, session.workspaceId).sort((a, b) => {
				return b.createdAt - a.createdAt
			})
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
			{todayFiles.length ? <SidebarRecentSection title={'Today'} files={todayFiles} /> : null}
			{yesterdayFiles.length ? (
				<SidebarRecentSection title={'Yesterday'} files={yesterdayFiles} />
			) : null}
			{thisWeekFiles.length ? (
				<SidebarRecentSection title={'This week'} files={thisWeekFiles} />
			) : null}
			{thisMonthFiles.length ? (
				<SidebarRecentSection title={'This month'} files={thisMonthFiles} />
			) : null}
		</>
	)
}

function SidebarGroups() {
	const app = useApp()
	const groups = useValue(
		'user groups',
		() => {
			const session = app.getSession()
			if (!session) return
			return app.getUserGroups(session.userId, session.workspaceId)
		},
		[app]
	)
	if (!groups) throw Error('Could not get groups')

	return (
		<>
			{groups.map((group) => (
				<SidebarGroup key={group.id} {...group} />
			))}
		</>
	)
}

function SidebarGroup({ id, name }: TldrawAppGroup) {
	const app = useApp()
	const files = useValue(
		'recent user files',
		() => {
			const session = app.getSession()
			if (!session) return
			return app.getGroupFiles(id, session.workspaceId)
		},
		[app, id]
	)
	if (!files) throw Error('Could not get files')

	return (
		<div className="tla_sidebar__section">
			<TlaSpacer height="20" />
			<div className="tla_sidebar__section_title">{name}</div>
			{files.map((file) => (
				<SidebarFileLink key={'group_' + file.id} file={file} />
			))}
		</div>
	)
}

function SidebarUserLink() {
	const app = useApp()
	const user = useValue(
		'recent user files',
		() => {
			const session = app.getSession()
			if (!session) return
			return app.get<TldrawAppUser>(session.userId)
		},
		[app]
	)
	if (!user) throw Error('Could not get user')

	return (
		<div className="tla_sidebar__user tla_sidebar__hoverable">
			<div className="tla_icon_wrapper">
				<TlaAvatar data-size="m" />
			</div>
			<div className="tla_sidebar__label">{user.name}</div>
			<Link className="tla_sidebar__link-button" to={`/`} />
			<button className="tla_sidebar__link-menu">
				<TlaIcon icon="more" />
			</button>
		</div>
	)
}
