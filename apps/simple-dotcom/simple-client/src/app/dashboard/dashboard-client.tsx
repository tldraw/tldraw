'use client'

import { Document, Folder, RecentDocument, User, Workspace } from '@/lib/api/types'
import { getBrowserClient } from '@/lib/supabase/browser'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

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
	const [successMessage, setSuccessMessage] = useState<string | null>(null)

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

	// New states for improved UX
	const [validationError, setValidationError] = useState<string | null>(null)
	const currentRequestRef = useRef<AbortController | null>(null)

	// Check for success message from leaving workspace
	useEffect(() => {
		const message = sessionStorage.getItem('leaveWorkspaceSuccess')
		if (message) {
			setSuccessMessage(message)
			sessionStorage.removeItem('leaveWorkspaceSuccess')
			// Auto-dismiss after 5 seconds
			setTimeout(() => setSuccessMessage(null), 5000)
		}
	}, [])

	// Define handlers before useEffect to avoid dependency issues
	const handleCloseCreateModal = () => {
		// Cancel any pending request
		if (currentRequestRef.current) {
			currentRequestRef.current.abort()
		}
		setShowCreateModal(false)
		setNewWorkspaceName('')
		setValidationError(null)
		setActionLoading(false)
	}

	// Keyboard event handling for modal
	useEffect(() => {
		if (!showCreateModal) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				handleCloseCreateModal()
			} else if (e.key === 'Enter' && newWorkspaceName.trim() && !actionLoading) {
				e.preventDefault()
				handleCreateWorkspace()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [showCreateModal, newWorkspaceName, actionLoading])

	const handleSignOut = async () => {
		const supabase = getBrowserClient()
		await supabase.auth.signOut()
		router.push('/login')
		router.refresh() // Refresh server components
	}

	const handleCreateWorkspace = async () => {
		if (!newWorkspaceName.trim()) {
			setValidationError('Workspace name is required')
			return
		}

		try {
			setActionLoading(true)
			setValidationError(null)

			// Create AbortController for request cancellation
			const abortController = new AbortController()
			currentRequestRef.current = abortController

			const response = await fetch('/api/workspaces', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newWorkspaceName.trim() }),
				signal: abortController.signal,
			})

			const data = await response.json()

			if (data.success && data.data) {
				// Add new workspace to dashboard
				setDashboardData((prev) => ({
					...prev,
					workspaces: [{ workspace: data.data, documents: [], folders: [] }, ...prev.workspaces],
				}))
				setExpandedWorkspaces((prev) => new Set([...prev, data.data.id]))
				// Only close modal on success
				setShowCreateModal(false)
				setNewWorkspaceName('')
				setValidationError(null)
			} else {
				// Show error in modal, not alert
				setValidationError(data.error?.message || 'Failed to create workspace')
			}
		} catch (err: any) {
			// Don't show error if request was aborted
			if (err.name !== 'AbortError') {
				console.error('Failed to create workspace:', err)
				setValidationError('Failed to create workspace. Please try again.')
			}
		} finally {
			setActionLoading(false)
			currentRequestRef.current = null
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
		<div className="flex min-h-screen bg-background" data-testid="dashboard">
			{/* Success Message */}
			{successMessage && (
				<div className="absolute top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md shadow-md flex items-center gap-2">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>{successMessage}</span>
					<button
						onClick={() => setSuccessMessage(null)}
						className="ml-2 text-green-600 hover:text-green-800"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			)}

			{/* Sidebar */}
			<div className="w-80 border-r border-foreground/20 flex flex-col">
				<div className="p-4 border-b border-foreground/20">
					<h2 className="text-lg font-semibold mb-2">Workspaces</h2>
					<button
						onClick={() => {
							setNewWorkspaceName('')
							setValidationError(null)
							setShowCreateModal(true)
						}}
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
											{workspace.is_private && (
												<span className="text-sm text-foreground/40">(Cannot modify)</span>
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
											key={recent.id}
											href={`/d/${recent.id}`}
											className="block p-3 rounded-md border border-foreground/10 hover:bg-foreground/5"
											data-testid={`recent-document-${recent.id}`}
										>
											<div className="flex items-center justify-between">
												<div>
													<h4 className="font-medium">{recent.name}</h4>
													<p className="text-sm text-foreground/60">{recent.workspace_name}</p>
												</div>
												<p className="text-xs text-foreground/40">
													{new Date(recent.accessed_at).toLocaleDateString()}
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
							onChange={(e) => {
								setNewWorkspaceName(e.target.value)
								// Clear validation error when user starts typing
								if (validationError) setValidationError(null)
							}}
							onBlur={() => {
								// Show validation on blur if empty
								if (!newWorkspaceName.trim()) {
									setValidationError('Workspace name is required')
								}
							}}
							placeholder="Workspace name"
							data-testid="workspace-name-input"
							className={`w-full px-3 py-2 rounded-md border ${
								validationError ? 'border-red-500' : 'border-foreground/20'
							} bg-background mb-2`}
							disabled={actionLoading}
							autoFocus
						/>
						{validationError && (
							<p className="text-red-500 text-sm mb-4" data-testid="validation-error">
								{validationError}
							</p>
						)}
						{!validationError && <div className="mb-4" />}
						<div className="flex gap-2 justify-end">
							<button
								onClick={handleCloseCreateModal}
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
