'use client'

import { User, Workspace } from '@/lib/api/types'
import { authClient } from '@/lib/auth-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
	const router = useRouter()
	const { data: session } = authClient.useSession()
	const [profile, setProfile] = useState<User | null>(null)
	const [workspaces, setWorkspaces] = useState<Workspace[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Modal states
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [showRenameModal, setShowRenameModal] = useState(false)
	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
	const [newWorkspaceName, setNewWorkspaceName] = useState('')
	const [actionLoading, setActionLoading] = useState(false)

	// Fetch user profile to get display_name
	useEffect(() => {
		const fetchProfile = async () => {
			if (!session) return

			try {
				const response = await fetch('/api/profile')
				const data = await response.json()

				if (data.success && data.data) {
					setProfile(data.data)
				}
			} catch (err) {
				console.error('Failed to fetch profile:', err)
			}
		}

		fetchProfile()
	}, [session])

	// Fetch workspaces
	useEffect(() => {
		const fetchWorkspaces = async () => {
			if (!session) return

			try {
				setLoading(true)
				const response = await fetch('/api/workspaces')
				const data = await response.json()

				if (data.success && data.data) {
					setWorkspaces(data.data)
				} else {
					setError('Failed to load workspaces')
				}
			} catch (err) {
				console.error('Failed to fetch workspaces:', err)
				setError('Failed to load workspaces')
			} finally {
				setLoading(false)
			}
		}

		fetchWorkspaces()
	}, [session])

	const handleSignOut = async () => {
		await authClient.signOut()
		router.push('/login')
	}

	const handleCreateWorkspace = async () => {
		if (!newWorkspaceName.trim()) return

		try {
			setActionLoading(true)
			const response = await fetch('/api/workspaces', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newWorkspaceName.trim() }),
			})

			const data = await response.json()

			if (data.success && data.data) {
				setWorkspaces([data.data, ...workspaces])
				setShowCreateModal(false)
				setNewWorkspaceName('')
			} else {
				alert(data.error?.message || 'Failed to create workspace')
			}
		} catch (err) {
			console.error('Failed to create workspace:', err)
			alert('Failed to create workspace')
		} finally {
			setActionLoading(false)
		}
	}

	const handleRenameWorkspace = async () => {
		if (!selectedWorkspace || !newWorkspaceName.trim()) return

		try {
			setActionLoading(true)
			const response = await fetch(`/api/workspaces/${selectedWorkspace.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newWorkspaceName.trim() }),
			})

			const data = await response.json()

			if (data.success && data.data) {
				setWorkspaces(workspaces.map((ws) => (ws.id === selectedWorkspace.id ? data.data : ws)))
				setShowRenameModal(false)
				setNewWorkspaceName('')
				setSelectedWorkspace(null)
			} else {
				alert(data.error?.message || 'Failed to rename workspace')
			}
		} catch (err) {
			console.error('Failed to rename workspace:', err)
			alert('Failed to rename workspace')
		} finally {
			setActionLoading(false)
		}
	}

	const handleDeleteWorkspace = async () => {
		if (!selectedWorkspace) return

		try {
			setActionLoading(true)
			const response = await fetch(`/api/workspaces/${selectedWorkspace.id}`, {
				method: 'DELETE',
			})

			const data = await response.json()

			if (data.success) {
				setWorkspaces(workspaces.filter((ws) => ws.id !== selectedWorkspace.id))
				setShowDeleteModal(false)
				setSelectedWorkspace(null)
			} else {
				alert(data.error?.message || 'Failed to delete workspace')
			}
		} catch (err) {
			console.error('Failed to delete workspace:', err)
			alert('Failed to delete workspace')
		} finally {
			setActionLoading(false)
		}
	}

	const openRenameModal = (workspace: Workspace) => {
		setSelectedWorkspace(workspace)
		setNewWorkspaceName(workspace.name)
		setShowRenameModal(true)
	}

	const openDeleteModal = (workspace: Workspace) => {
		setSelectedWorkspace(workspace)
		setShowDeleteModal(true)
	}

	if (!session) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p>Loading...</p>
			</div>
		)
	}

	// Use display_name from profile, fallback to name from session, then 'User'
	const displayName = profile?.display_name || session.user?.name || 'User'

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-7xl">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<div className="flex items-center gap-3">
						<Link
							href="/profile"
							className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
						>
							Profile
						</Link>
						<button
							onClick={handleSignOut}
							data-testid="logout-button"
							className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
						>
							Sign out
						</button>
					</div>
				</div>

				<div className="rounded-lg border border-foreground/20 p-6">
					<h2 className="text-xl font-semibold mb-4">Welcome, {displayName}!</h2>
					<p className="text-foreground/60 mb-6">Manage your workspaces below.</p>

					{/* Create Workspace Button */}
					<button
						onClick={() => setShowCreateModal(true)}
						data-testid="create-workspace-button"
						className="mb-6 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
					>
						Create Workspace
					</button>

					{/* Workspace List */}
					<div data-testid="workspace-list" className="mt-6">
						{loading && <p className="text-foreground/60">Loading workspaces...</p>}
						{error && <p className="text-red-500">{error}</p>}
						{!loading && !error && workspaces.length === 0 && (
							<p className="text-foreground/60">
								No workspaces yet. Create your first workspace above!
							</p>
						)}
						{!loading && !error && workspaces.length > 0 && (
							<div className="space-y-2">
								{workspaces.map((workspace) => (
									<div
										key={workspace.id}
										data-testid={`workspace-item-${workspace.id}`}
										className="flex items-center justify-between p-4 rounded-md border border-foreground/10 hover:bg-foreground/5"
									>
										<div>
											<h3 className="font-medium">{workspace.name}</h3>
											<p className="text-sm text-foreground/60">
												{workspace.is_private ? 'Private' : 'Shared'} Workspace
											</p>
										</div>
										<div className="flex items-center gap-2">
											{!workspace.is_private && workspace.owner_id === session.user.id && (
												<>
													<button
														onClick={() => openRenameModal(workspace)}
														data-testid={`rename-workspace-${workspace.id}`}
														className="rounded-md border border-foreground/20 px-3 py-1 text-sm hover:bg-foreground/5"
													>
														Rename
													</button>
													<button
														onClick={() => openDeleteModal(workspace)}
														data-testid={`delete-workspace-${workspace.id}`}
														className="rounded-md border border-red-500/50 px-3 py-1 text-sm text-red-500 hover:bg-red-500/10"
													>
														Delete
													</button>
												</>
											)}
											{workspace.is_private && (
												<span className="text-sm text-foreground/40">(Cannot modify)</span>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Create Workspace Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
					<div className="bg-background rounded-lg p-6 max-w-md w-full border border-foreground/20">
						<h3 className="text-xl font-semibold mb-4">Create New Workspace</h3>
						<input
							type="text"
							value={newWorkspaceName}
							onChange={(e) => setNewWorkspaceName(e.target.value)}
							placeholder="Workspace name"
							data-testid="workspace-name-input"
							className="w-full px-3 py-2 rounded-md border border-foreground/20 bg-background mb-4"
							disabled={actionLoading}
						/>
						<div className="flex gap-2 justify-end">
							<button
								onClick={() => {
									setShowCreateModal(false)
									setNewWorkspaceName('')
								}}
								className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
								disabled={actionLoading}
							>
								Cancel
							</button>
							<button
								onClick={handleCreateWorkspace}
								data-testid="confirm-create-workspace"
								className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
								disabled={actionLoading || !newWorkspaceName.trim()}
							>
								{actionLoading ? 'Creating...' : 'Create'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Rename Workspace Modal */}
			{showRenameModal && selectedWorkspace && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
					<div className="bg-background rounded-lg p-6 max-w-md w-full border border-foreground/20">
						<h3 className="text-xl font-semibold mb-4">Rename Workspace</h3>
						<input
							type="text"
							value={newWorkspaceName}
							onChange={(e) => setNewWorkspaceName(e.target.value)}
							placeholder="New workspace name"
							data-testid="rename-workspace-input"
							className="w-full px-3 py-2 rounded-md border border-foreground/20 bg-background mb-4"
							disabled={actionLoading}
						/>
						<div className="flex gap-2 justify-end">
							<button
								onClick={() => {
									setShowRenameModal(false)
									setNewWorkspaceName('')
									setSelectedWorkspace(null)
								}}
								className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
								disabled={actionLoading}
							>
								Cancel
							</button>
							<button
								onClick={handleRenameWorkspace}
								data-testid="confirm-rename-workspace"
								className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
								disabled={actionLoading || !newWorkspaceName.trim()}
							>
								{actionLoading ? 'Renaming...' : 'Rename'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Workspace Modal */}
			{showDeleteModal && selectedWorkspace && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
					<div className="bg-background rounded-lg p-6 max-w-md w-full border border-foreground/20">
						<h3 className="text-xl font-semibold mb-4">Delete Workspace</h3>
						<p className="text-foreground/80 mb-4">
							Are you sure you want to delete &quot;{selectedWorkspace.name}&quot;? This action will
							soft-delete the workspace and remove it from your workspace list. The workspace can be
							restored later from the archive view.
						</p>
						<div className="flex gap-2 justify-end">
							<button
								onClick={() => {
									setShowDeleteModal(false)
									setSelectedWorkspace(null)
								}}
								className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
								disabled={actionLoading}
							>
								Cancel
							</button>
							<button
								onClick={handleDeleteWorkspace}
								data-testid="confirm-delete-workspace"
								className="rounded-md bg-red-500 text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
								disabled={actionLoading}
							>
								{actionLoading ? 'Deleting...' : 'Delete'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
