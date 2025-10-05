'use client'

import { Document, Folder, RecentDocument, User, Workspace } from '@/lib/api/types'
import { authClient } from '@/lib/auth-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface WorkspaceWithContent {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
}

interface DashboardData {
	workspaces: WorkspaceWithContent[]
	recentDocuments: RecentDocument[]
}

interface DashboardClientProps {
	initialData: DashboardData
	userProfile: User | null
	userId: string
}

export default function DashboardClient({
	initialData,
	userProfile,
	userId,
}: DashboardClientProps) {
	const router = useRouter()
	const [dashboardData, setDashboardData] = useState<DashboardData>(initialData)

	// Collapsible state for workspace sections - expand all by default
	const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(() => {
		return new Set(initialData.workspaces.map((w) => w.workspace.id))
	})

	// Modal states
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [showRenameModal, setShowRenameModal] = useState(false)
	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
	const [newWorkspaceName, setNewWorkspaceName] = useState('')
	const [actionLoading, setActionLoading] = useState(false)

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
				// Add new workspace to dashboard
				setDashboardData((prev) => ({
					...prev,
					workspaces: [{ workspace: data.data, documents: [], folders: [] }, ...prev.workspaces],
				}))
				setExpandedWorkspaces((prev) => new Set([...prev, data.data.id]))
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
				setDashboardData((prev) => ({
					...prev,
					workspaces: prev.workspaces.map((ws) =>
						ws.workspace.id === selectedWorkspace.id ? { ...ws, workspace: data.data } : ws
					),
				}))
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
				setDashboardData((prev) => ({
					...prev,
					workspaces: prev.workspaces.filter((ws) => ws.workspace.id !== selectedWorkspace.id),
				}))
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

	const toggleWorkspace = (workspaceId: string) => {
		setExpandedWorkspaces((prev) => {
			const next = new Set(prev)
			if (next.has(workspaceId)) {
				next.delete(workspaceId)
			} else {
				next.add(workspaceId)
			}
			return next
		})
	}

	const displayName = userProfile?.display_name || userProfile?.name || 'User'

	return (
		<div className="flex min-h-screen bg-background">
			{/* Sidebar */}
			<div className="w-80 border-r border-foreground/20 flex flex-col">
				<div className="p-4 border-b border-foreground/20">
					<h2 className="text-lg font-semibold mb-2">Workspaces</h2>
					<button
						onClick={() => setShowCreateModal(true)}
						data-testid="create-workspace-button"
						className="w-full rounded-md bg-foreground text-background px-3 py-2 text-sm font-medium hover:opacity-90"
					>
						Create Workspace
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-4" data-testid="workspace-list">
					{dashboardData.workspaces.length === 0 && (
						<p className="text-foreground/60 text-sm">
							No workspaces yet. Create your first workspace above!
						</p>
					)}
					{dashboardData.workspaces.length > 0 && (
						<div className="space-y-2">
							{dashboardData.workspaces.map(({ workspace, documents, folders }) => {
								const isExpanded = expandedWorkspaces.has(workspace.id)
								const isOwner = workspace.owner_id === userId

								return (
									<div
										key={workspace.id}
										data-testid={`workspace-item-${workspace.id}`}
										className="border border-foreground/10 rounded-md overflow-hidden"
									>
										{/* Workspace Header */}
										<div className="flex items-center justify-between p-3 bg-foreground/5">
											<button
												onClick={() => toggleWorkspace(workspace.id)}
												className="flex-1 flex items-center gap-2 text-left"
												data-testid={`toggle-workspace-${workspace.id}`}
											>
												<span className="text-sm">{isExpanded ? '▼' : '▶'}</span>
												<div className="flex-1">
													<h3 className="font-medium text-sm">{workspace.name}</h3>
													<p className="text-xs text-foreground/60">
														{workspace.is_private ? 'Private' : 'Shared'}
													</p>
												</div>
											</button>
											{!workspace.is_private && isOwner && (
												<div className="flex items-center gap-1">
													<button
														onClick={() => openRenameModal(workspace)}
														data-testid={`rename-workspace-${workspace.id}`}
														className="rounded px-2 py-1 text-xs hover:bg-foreground/10"
													>
														Rename
													</button>
													<button
														onClick={() => openDeleteModal(workspace)}
														data-testid={`delete-workspace-${workspace.id}`}
														className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
													>
														Delete
													</button>
												</div>
											)}
										</div>

										{/* Workspace Content - Documents & Folders */}
										{isExpanded && (
											<div
												className="p-3 space-y-2"
												data-testid={`workspace-content-${workspace.id}`}
											>
												{/* Folders */}
												{folders.length > 0 && (
													<div>
														<h4 className="text-xs font-semibold text-foreground/60 mb-1">
															Folders
														</h4>
														<div className="space-y-1">
															{folders.map((folder) => (
																<Link
																	key={folder.id}
																	href={`/workspace/${workspace.id}/folder/${folder.id}`}
																	className="block px-2 py-1 text-sm rounded hover:bg-foreground/5"
																	data-testid={`folder-${folder.id}`}
																>
																	📁 {folder.name}
																</Link>
															))}
														</div>
													</div>
												)}

												{/* Documents */}
												{documents.length > 0 && (
													<div>
														<h4 className="text-xs font-semibold text-foreground/60 mb-1">
															Documents
														</h4>
														<div className="space-y-1">
															{documents.map((doc) => (
																<Link
																	key={doc.id}
																	href={`/d/${doc.id}`}
																	className="block px-2 py-1 text-sm rounded hover:bg-foreground/5"
																	data-testid={`document-${doc.id}`}
																>
																	📄 {doc.name}
																</Link>
															))}
														</div>
													</div>
												)}

												{folders.length === 0 && documents.length === 0 && (
													<p className="text-xs text-foreground/40 italic">No items yet</p>
												)}
											</div>
										)}
									</div>
								)
							})}
						</div>
					)}
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 p-8 overflow-y-auto">
				<div className="mx-auto max-w-4xl">
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

						{/* Recent Documents */}
						{dashboardData.recentDocuments.length > 0 && (
							<div className="mt-6">
								<h3 className="text-lg font-semibold mb-3">Recent Documents</h3>
								<div className="space-y-2" data-testid="recent-documents-list">
									{dashboardData.recentDocuments.map((recent) => (
										<Link
											key={recent.document.id}
											href={`/d/${recent.document.id}`}
											className="block p-3 rounded-md border border-foreground/10 hover:bg-foreground/5"
											data-testid={`recent-document-${recent.document.id}`}
										>
											<div className="flex items-center justify-between">
												<div>
													<h4 className="font-medium">{recent.document.name}</h4>
													<p className="text-sm text-foreground/60">{recent.workspace.name}</p>
												</div>
												<p className="text-xs text-foreground/40">
													{new Date(recent.last_accessed_at).toLocaleDateString()}
												</p>
											</div>
										</Link>
									))}
								</div>
							</div>
						)}

						{dashboardData.recentDocuments.length === 0 && (
							<p className="text-foreground/60 mt-4">
								No recent documents. Access a document to see it here.
							</p>
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
