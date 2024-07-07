import { Link } from 'react-router-dom'
import { useAppApi, useAppState } from '../hooks/useAppState'
import { TldrawAppFile, TldrawAppGroup, getCleanId } from '../utils/tla/db'
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
	return (
		<button className="tla_sidebar__create tla_icon_wrapper ">
			<TlaIcon icon="edit-strong" />
		</button>
	)
}

function SidebarWorkspaceLink() {
	const { db, session } = useAppState()
	if (!session) throw Error('Session not found')

	const { getWorkspace } = useAppApi()

	const workspace = getWorkspace(db, session.workspaceId)
	if (!workspace) throw Error('Workspace not found')

	return (
		<div className="tla_sidebar__workspace tla_sidebar__hoverable">
			<div className="tla_icon_wrapper" data-size="m">
				<TlaIcon icon={workspace.icon} />
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
	const { setSidebarActiveTab } = useAppApi()
	const { sidebarActiveTab } = useAppState()
	return (
		<div className="tla_sidebar__tabs">
			<div className="tla_sidebar__line" />
			<button
				className="tla_sidebar__tabs_tab"
				data-active={sidebarActiveTab === 'recent'}
				onClick={() => {
					setSidebarActiveTab('recent')
				}}
			>
				Recent
			</button>
			<button
				className="tla_sidebar__tabs_tab"
				data-active={sidebarActiveTab === 'groups'}
				onClick={() => {
					setSidebarActiveTab('groups')
				}}
			>
				Groups
			</button>
		</div>
	)
}

function SidebarActiveTabContent() {
	const { sidebarActiveTab } = useAppState()

	if (sidebarActiveTab === 'recent') {
		return <SidebarRecentFiles />
	}

	if (sidebarActiveTab === 'groups') {
		return <SidebarGroups />
	}

	throw Error('unknown tab')
}

function SidebarMainLink({ icon, label, href }: SideBarMainLink) {
	const { session } = useAppState()
	if (!session) throw Error('Session not found')

	return (
		<div className="tla_sidebar__main-link tla_sidebar__hoverable">
			<div className="tla_icon_wrapper">
				<TlaIcon icon={icon} />
			</div>
			<Link
				className="tla_sidebar__link-button"
				to={`/${session.workspaceId.split(':')[1]}/${href}`}
			/>
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
				<SidebarFileLink key={file.id} file={file} />
			))}
		</div>
	)
}

function SidebarFileLink({ file }: { file: TldrawAppFile }) {
	const { workspaceId, id } = file
	return (
		<div className="tla_sidebar__section_link tla_sidebar__hoverable">
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
	const { getUserRecentFiles } = useAppApi()
	const { db, session } = useAppState()
	if (!session) throw Error('Session not found')

	const files = getUserRecentFiles(db, session.userId, session.workspaceId)

	// split the files into today, yesterday, this week, this month, and then by month
	const day = 1000 * 60 * 60 * 24
	const todayFiles: TldrawAppFile[] = []
	const yesterdayFiles: TldrawAppFile[] = []
	const thisWeekFiles: TldrawAppFile[] = []
	const thisMonthFiles: TldrawAppFile[] = []
	const olderFiles: TldrawAppFile[] = []

	for (const file of files) {
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
	const { getUserGroups } = useAppApi()
	const { db, session } = useAppState()
	if (!session) throw Error('Session not found')

	const groups = getUserGroups(db, session.userId, session.workspaceId)
	groups.sort((a, b) => b.createdAt - a.createdAt)

	return (
		<>
			{groups.map((group) => (
				<SidebarGroup key={group.id} {...group} />
			))}
		</>
	)
}

function SidebarGroup({ id, name }: TldrawAppGroup) {
	const { getGroupFiles } = useAppApi()
	const { db, session } = useAppState()
	if (!session) throw Error('Session not found')

	const files = getGroupFiles(db, id, session.workspaceId)

	return (
		<div className="tla_sidebar__section">
			<TlaSpacer height="20" />
			<div className="tla_sidebar__section_title">{name}</div>
			{files.map((file) => (
				<SidebarFileLink key={file.id} file={file} />
			))}
		</div>
	)
}

function SidebarUserLink() {
	const { getUser } = useAppApi()
	const { db, session } = useAppState()
	if (!session) throw Error('Session not found')

	const user = getUser(db, session.userId)
	if (!user) throw Error('User not found')

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
