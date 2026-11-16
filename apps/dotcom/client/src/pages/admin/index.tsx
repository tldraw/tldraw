import { Helmet } from 'react-helmet-async'
import { Navigate, NavLink, useParams } from 'react-router-dom'
import { useTldrawCurrentUser } from '../../tla/hooks/useUser'
import { EffectsSection } from './EffectsSection'
import { FilesSection } from './FilesSection'
import { FlagsSection } from './FlagsSection'
import { SystemSection } from './SystemSection'
import { UsersSection } from './UsersSection'
import { WorkspacesSection } from './WorkspacesSection'
import styles from './admin.module.css'

const SECTIONS = [
	{ id: 'users', label: 'Users' },
	{ id: 'workspaces', label: 'Workspaces' },
	{ id: 'files', label: 'Files & boards' },
	{ id: 'flags', label: 'Feature flags' },
	{ id: 'effects', label: 'Effect outbox' },
	{ id: 'system', label: 'System' },
] as const

export function Component() {
	const user = useTldrawCurrentUser()
	const { section, fileId } = useParams()

	if (!user?.isTldraw) {
		return <Navigate to="/" replace />
	}
	const current = SECTIONS.find((s) => s.id === section)
	if (!current || (fileId && section !== 'files')) {
		return <Navigate to="/admin/users" replace />
	}

	return (
		<div className={styles.adminLayout}>
			<Helmet title={`${current.label} • Admin`} />
			<nav className={styles.adminSidebar}>
				<div className={styles.adminSidebarTitle}>Admin</div>
				{SECTIONS.map((s) => (
					<NavLink
						key={s.id}
						to={`/admin/${s.id}`}
						className={({ isActive }) =>
							isActive
								? `${styles.adminSidebarItem} ${styles.adminSidebarItemActive}`
								: styles.adminSidebarItem
						}
					>
						<span>{s.label}</span>
					</NavLink>
				))}
			</nav>
			<main className={styles.adminMain}>
				{section === 'users' && <UsersSection />}
				{section === 'flags' && <FlagsSection />}
				{section === 'workspaces' && <WorkspacesSection />}
				{section === 'files' && <FilesSection fileId={fileId} />}
				{section === 'effects' && <EffectsSection />}
				{section === 'system' && <SystemSection />}
			</main>
		</div>
	)
}
