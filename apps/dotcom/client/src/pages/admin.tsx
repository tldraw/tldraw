import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTldrawUser } from '../tla/hooks/useUser'
import styles from './admin.module.css'
import { AdminBatchMigration } from './admin/AdminBatchMigration'
import { AdminDangerZone } from './admin/AdminDangerZone'
import { AdminFairies } from './admin/AdminFairies'
import { AdminFeatureFlags } from './admin/AdminFeatureFlags'
import { AdminFileOperations } from './admin/AdminFileOperations'
import { AdminUserManagement } from './admin/AdminUserManagement'
import { AdminWhatsNew } from './admin/AdminWhatsNew'

type AdminTab =
	| 'user-management'
	| 'fairies'
	| 'feature-flags'
	| 'whats-new'
	| 'file-operations'
	| 'batch-migration'
	| 'danger-zone'

export function Component() {
	const user = useTldrawUser()
	const [activeTab, setActiveTab] = useState<AdminTab>('user-management')

	if (!user?.isTldraw) {
		return <Navigate to="/" replace />
	}

	const tabs: { id: AdminTab; label: string }[] = [
		{ id: 'user-management', label: 'User management' },
		{ id: 'fairies', label: 'Fairies' },
		{ id: 'feature-flags', label: 'Feature flags' },
		{ id: 'whats-new', label: "What's new" },
		{ id: 'file-operations', label: 'File operations' },
		{ id: 'batch-migration', label: 'Batch migration' },
		{ id: 'danger-zone', label: 'Danger zone' },
	]

	return (
		<div className={styles.adminContainer}>
			<header className={styles.adminHeader}>
				<h1 className="tla-text_ui__big">Admin Panel</h1>
			</header>

			<div className={styles.tabBar}>
				{tabs.map((tab) => (
					<button
						key={tab.id}
						className={activeTab === tab.id ? styles.tabButtonActive : styles.tabButton}
						onClick={() => setActiveTab(tab.id)}
					>
						{tab.label}
					</button>
				))}
			</div>

			<main className={styles.adminContent}>
				{activeTab === 'user-management' && <AdminUserManagement />}
				{activeTab === 'fairies' && <AdminFairies />}
				{activeTab === 'feature-flags' && <AdminFeatureFlags />}
				{activeTab === 'whats-new' && <AdminWhatsNew />}
				{activeTab === 'file-operations' && <AdminFileOperations />}
				{activeTab === 'batch-migration' && <AdminBatchMigration />}
				{activeTab === 'danger-zone' && <AdminDangerZone />}
			</main>
		</div>
	)
}
