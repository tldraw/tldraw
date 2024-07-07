import { ReactNode } from 'react'
import { useAppState } from '../hooks/useAppState'
import { TldrawAppFile } from '../utils/tla/db'
import { TlaAvatar } from './TlaAvatar'
import { TlaIcon } from './TlaIcon'
import { TlaSpacer } from './TlaSpacer'

export function TlaSidebar() {
	return (
		<div className="tla_sidebar">
			<SidebarCreateButton />
			<div className="tla_sidebar__top">
				<SidebarWorkspaceLink />
			</div>
			<div className="tla_sidebar__content">
				<SidebarMainLink icon="doc">Drafts</SidebarMainLink>
				<SidebarMainLink icon="star">Starred</SidebarMainLink>
				<SidebarMainLink icon="link">Shared with me</SidebarMainLink>
				<SidebarRecentFiles />
				<TlaSpacer height="20" />
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
	const { getWorkspace, session } = useAppState()
	if (!session) throw Error('Session not found')

	const workspace = getWorkspace(session.workspaceId)
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

function SidebarMainLink({ icon, children }: { icon: string; children: ReactNode }) {
	return (
		<div className="tla_sidebar__main-link tla_sidebar__hoverable">
			<div className="tla_icon_wrapper">
				<TlaIcon icon={icon} />
			</div>
			<button className="tla_sidebar__link-button" />
			<div className="tla_sidebar__label">{children}</div>
		</div>
	)
}

function SidebarRecentFiles() {
	const { getUserFiles, session } = useAppState()
	if (!session) throw Error('Session not found')

	const files = getUserFiles(session.userId, session.workspaceId)
	files.sort((a, b) => b.updatedAt - a.updatedAt)

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
			{todayFiles.length ? <SidebarSection title={'Today'} files={todayFiles} /> : null}
			{yesterdayFiles.length ? <SidebarSection title={'Yesterday'} files={yesterdayFiles} /> : null}
			{thisWeekFiles.length ? <SidebarSection title={'This week'} files={thisWeekFiles} /> : null}
			{thisMonthFiles.length ? (
				<SidebarSection title={'This month'} files={thisMonthFiles} />
			) : null}
		</>
	)
}

function SidebarSection({ title, files }: { title: string; files: TldrawAppFile[] }) {
	return (
		<div className="tla_sidebar__section">
			<TlaSpacer height="20" />
			<div className="tla_sidebar__section_title">{title}</div>
			{files.map((file) => (
				<SidebarFileLink key={file.id}>
					{file.name || new Date(file.createdAt).toLocaleString('en-gb')}
				</SidebarFileLink>
			))}
		</div>
	)
}

function SidebarFileLink({ children }: { children: ReactNode }) {
	return (
		<div className="tla_sidebar__section_link tla_sidebar__hoverable">
			<div className="tla_sidebar__label">{children}</div>
			<button className="tla_sidebar__link-button" />
			<button className="tla_sidebar__link-menu">
				<TlaIcon icon="more" />
			</button>
		</div>
	)
}

function SidebarUserLink() {
	const { session, getUser } = useAppState()
	if (!session) throw Error('Session not found')

	const user = getUser(session.userId)
	if (!user) throw Error('User not found')

	return (
		<div className="tla_sidebar__user tla_sidebar__hoverable">
			<div className="tla_icon_wrapper">
				<TlaAvatar data-size="m" />
			</div>
			<div className="tla_sidebar__label">{user.name}</div>
			<button className="tla_sidebar__link-button" />
			<button className="tla_sidebar__link-menu">
				<TlaIcon icon="more" />
			</button>
		</div>
	)
}
