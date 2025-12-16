import { FeatureFlagValue, WhatsNewEntry } from '@tldraw/dotcom-shared'
import { useState } from 'react'
import { Navigate, useLoaderData } from 'react-router-dom'
import { fetch, getFromLocalStorage, setInLocalStorage } from 'tldraw'
import { useTldrawUser } from '../tla/hooks/useUser'
import styles from './admin.module.css'
import { AdminDangerZone } from './admin/AdminDangerZone'
import { AdminFairies, FairyInvite } from './admin/AdminFairies'
import { AdminFeatureFlags } from './admin/AdminFeatureFlags'
import { AdminFileOperations } from './admin/AdminFileOperations'
import { AdminUserManagement, ReplicatorData } from './admin/AdminUserManagement'
import { AdminWhatsNew } from './admin/AdminWhatsNew'

type AdminTab =
	| 'user-management'
	| 'fairies'
	| 'feature-flags'
	| 'whats-new'
	| 'file-operations'
	| 'danger-zone'

const ADMIN_TAB_KEY = 'tldraw_admin_active_tab'

function getStoredTab(): AdminTab {
	const stored = getFromLocalStorage(ADMIN_TAB_KEY)
	return (stored as AdminTab) || 'user-management'
}

interface AdminLoaderData {
	featureFlags: Record<string, FeatureFlagValue>
	whatsNewEntries: WhatsNewEntry[]
	fairyInvites: FairyInvite[]
	replicatorData: ReplicatorData
}

export async function loader(): Promise<AdminLoaderData> {
	try {
		const [featureFlagsRes, whatsNewRes, fairyInvitesRes, replicatorRes] = await Promise.all([
			fetch('/api/app/admin/feature-flags'),
			fetch('/api/app/admin/whats-new'),
			fetch('/api/app/admin/fairy-invites'),
			fetch('/api/app/admin/replicator'),
		])

		const [featureFlags, whatsNewEntries, fairyInvites, replicatorData] = await Promise.all([
			featureFlagsRes.ok ? featureFlagsRes.json() : {},
			whatsNewRes.ok ? whatsNewRes.json() : [],
			fairyInvitesRes.ok ? fairyInvitesRes.json() : [],
			replicatorRes.ok ? replicatorRes.json() : null,
		])

		return {
			featureFlags: featureFlags as Record<string, FeatureFlagValue>,
			whatsNewEntries: Array.isArray(whatsNewEntries) ? whatsNewEntries : [],
			fairyInvites: Array.isArray(fairyInvites) ? fairyInvites : [],
			replicatorData: replicatorData as ReplicatorData,
		}
	} catch (err) {
		console.error('Admin loader failed:', err)
		return {
			featureFlags: {},
			whatsNewEntries: [],
			fairyInvites: [],
			replicatorData: null as any,
		}
	}
}

export function Component() {
	const user = useTldrawUser()
	const data = useLoaderData() as AdminLoaderData
	const [activeTab, setActiveTab] = useState<AdminTab>(getStoredTab())

	if (!user?.isTldraw) {
		return <Navigate to="/" replace />
	}

	const tabs: { id: AdminTab; label: string }[] = [
		{ id: 'user-management', label: 'User management' },
		{ id: 'fairies', label: 'Fairies' },
		{ id: 'feature-flags', label: 'Feature flags' },
		{ id: 'whats-new', label: "What's new" },
		{ id: 'file-operations', label: 'File operations' },
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
						onClick={() => {
							setActiveTab(tab.id)
							setInLocalStorage(ADMIN_TAB_KEY, tab.id)
						}}
					>
						{tab.label}
					</button>
				))}
			</div>

			<main className={styles.adminContent}>
				{activeTab === 'user-management' && (
					<AdminUserManagement initialReplicatorData={data.replicatorData} />
				)}
				{activeTab === 'fairies' && <AdminFairies initialInvites={data.fairyInvites} />}
				{activeTab === 'feature-flags' && <AdminFeatureFlags initialFlags={data.featureFlags} />}
				{activeTab === 'whats-new' && <AdminWhatsNew initialEntries={data.whatsNewEntries} />}
				{activeTab === 'file-operations' && <AdminFileOperations />}
				{activeTab === 'danger-zone' && <AdminDangerZone />}
			</main>
		</div>
	)
}
