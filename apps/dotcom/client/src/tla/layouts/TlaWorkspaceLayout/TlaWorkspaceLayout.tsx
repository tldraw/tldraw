import classNames from 'classnames'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { F, useValue } from 'tldraw'
import { routes } from '../../../routeDefs'
import { TlaSidebarDotDevLink } from '../../components/TlaSidebar/components/TlaSidebarDotDevLink'
import { TlaSidebarFeedbackButton } from '../../components/TlaSidebar/components/TlaSidebarFeedbackButton'
import { TlaSidebarFileLink } from '../../components/TlaSidebar/components/TlaSidebarFileLink'
import { TlaSidebarFileSection } from '../../components/TlaSidebar/components/TlaSidebarFileSection'
import { TlaSidebarSearch } from '../../components/TlaSidebar/components/TlaSidebarSearch'
import { TlaUserSettingsMenu } from '../../components/TlaSidebar/components/TlaSidebarUserSettingsMenu'
import { TlaSidebarWorkspaceLink } from '../../components/TlaSidebar/components/TlaSidebarWorkspaceLink'
import { useActiveWorkspaceId } from '../../hooks/useActiveWorkspaceId'
import { useApp } from '../../hooks/useAppState'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import { useWorkspaceName } from '../../hooks/useWorkspaceName'
import sidebarStyles from '../../components/TlaSidebar/sidebar.module.css'
import styles from './workspace-layout.module.css'

/** The v3 shell for everything that isn't the canvas: a fixed sidebar and a scrolling main column. */
export function TlaWorkspaceLayout({ children }: { children: ReactNode }) {
	usePreventAccidentalDrops()

	return (
		<div className={styles.layout} data-testid="tla-workspace-layout">
			<TlaWorkspaceSidebar />
			<main className={styles.main}>{children}</main>
		</div>
	)
}

function TlaWorkspaceSidebar() {
	return (
		<nav className={styles.sidebar} data-testid="tla-workspace-sidebar">
			<div className={sidebarStyles.sidebarTopRow}>
				<TlaSidebarWorkspaceLink />
			</div>
			<div className={classNames(sidebarStyles.sidebarSection, styles.search)}>
				<TlaSidebarSearch />
			</div>
			<div className={sidebarStyles.sidebarDivider} />
			<TlaWorkspaceList />
			<div className={sidebarStyles.sidebarDivider} />
			<div className={sidebarStyles.sidebarContent} data-sidebar-scroll-container>
				<TlaWorkspaceFavorites />
			</div>
			<div className={sidebarStyles.sidebarBottomArea}>
				<div className={sidebarStyles.sidebarDivider} />
				<TlaSidebarDotDevLink />
				<TlaSidebarFeedbackButton />
				<div className={sidebarStyles.sidebarBottomRow}>
					<TlaUserSettingsMenu />
				</div>
			</div>
		</nav>
	)
}

function TlaWorkspaceList() {
	const app = useApp()
	const activeWorkspaceId = useActiveWorkspaceId()
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const workspaceIds = useValue(
		'workspace ids',
		() =>
			app
				.getWorkspaceMemberships()
				.filter((g) => g.groupId !== homeWorkspaceId && !!g.group)
				.map((g) => g.groupId),
		[app, homeWorkspaceId]
	)

	return (
		<div className={sidebarStyles.sidebarSection} data-testid="tla-workspace-list">
			{[homeWorkspaceId, ...workspaceIds].map((workspaceId) => (
				<TlaWorkspaceListItem
					key={workspaceId}
					workspaceId={workspaceId}
					isActive={workspaceId === activeWorkspaceId}
				/>
			))}
		</div>
	)
}

function TlaWorkspaceListItem({
	workspaceId,
	isActive,
}: {
	workspaceId: string
	isActive: boolean
}) {
	const name = useWorkspaceName(workspaceId)
	return (
		<Link
			to={routes.tlaWorkspace(workspaceId)}
			className={classNames(
				sidebarStyles.sidebarActionButton,
				sidebarStyles.hoverable,
				'tla-text_ui__regular',
				'notranslate'
			)}
			data-active={isActive}
			data-testid="tla-workspace-list-item"
		>
			<span className={sidebarStyles.sidebarActionButtonLabel}>{name}</span>
		</Link>
	)
}

function TlaWorkspaceFavorites() {
	const app = useApp()
	const workspaceId = useActiveWorkspaceId()
	const pinned = useValue(
		'pinned files',
		() => app.getWorkspaceFilesSorted(workspaceId).filter((f) => f.isPinned),
		[app, workspaceId]
	)

	if (!pinned.length) return null

	return (
		<TlaSidebarFileSection title={<F defaultMessage="Favorites" />}>
			{pinned.map((item, i) => (
				<TlaSidebarFileLink
					key={item.fileId}
					workspaceId={workspaceId}
					item={item}
					testId={`tla-file-link-favorites-${i}`}
				/>
			))}
		</TlaSidebarFileSection>
	)
}
