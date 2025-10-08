'use client'

import { DocumentActions } from '@/components/documents/DocumentActions'
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime'
import { Document, Folder, RecentDocument, User, Workspace, WorkspaceRole } from '@/lib/api/types'
import { getBrowserClient } from '@/lib/supabase/browser'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface WorkspaceWithContent {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
	userRole: WorkspaceRole
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
	const queryClient = useQueryClient()
	const [successMessage, setSuccessMessage] = useState<string | null>(null)

	// Fetch dashboard data with React Query
	// Hybrid approach: Realtime for instant updates + polling for reliability
	const { data: dashboardData = initialData } = useQuery<DashboardData>({
		queryKey: ['dashboard', userId],
		queryFn: async () => {
			const response = await fetch('/api/dashboard')
			const result = await response.json()
			if (!result.success) {
				throw new Error(result.error?.message || 'Failed to fetch dashboard data')
			}
			return result.data
		},
		initialData,
		staleTime: 1000 * 10, // 10 seconds - shorter to catch missed realtime events
		refetchInterval: 1000 * 15, // Poll every 15 seconds as fallback
		refetchOnMount: true, // Refetch when returning to dashboard
		refetchOnReconnect: true, // Refetch when connection restored
	})

	// Enable realtime subscriptions for all workspaces (handles changes from other users)
	const workspaceIds = dashboardData.workspaces.map((w) => w.workspace.id)
	useDashboardRealtime(userId, workspaceIds)

	// Collapsible state for workspace sections - expand all by default
	const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(() => {
		return new Set(initialData.workspaces.map((w) => w.workspace.id))
	})

	// Modal states
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [showRenameModal, setShowRenameModal] = useState(false)
	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const [showCreateDocumentModal, setShowCreateDocumentModal] = useState(false)
	const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
	const [newWorkspaceName, setNewWorkspaceName] = useState('')
	const [newDocumentName, setNewDocumentName] = useState('')
	const [actionLoading, setActionLoading] = useState(false)

	// New states for improved UX
	const [validationError, setValidationError] = useState<string | null>(null)
	const currentRequestRef = useRef<AbortController | null>(null)
	const documentNameInputRef = useRef<HTMLInputElement>(null)

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
				// Invalidate to trigger refetch and wait for it to complete
				await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
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
				// Refetch to ensure UI updates before modal closes
				await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
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
				// Invalidate to trigger refetch
				queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
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

	const handleCreateDocument = async () => {
		if (!selectedWorkspace || !newDocumentName.trim()) {
			setValidationError('Document name is required')
			return
		}

		try {
			setActionLoading(true)
			setValidationError(null)

			const abortController = new AbortController()
			currentRequestRef.current = abortController

			const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/documents`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newDocumentName.trim() }),
				signal: abortController.signal,
			})

			const data = await response.json()

			if (data.success && data.data) {
				// Document will be added via realtime subscription
				setShowCreateDocumentModal(false)
				setNewDocumentName('')
				setValidationError(null)
				setSelectedWorkspace(null)
			} else {
				setValidationError(data.error?.message || 'Failed to create document')
			}
		} catch (err: any) {
			if (err.name !== 'AbortError') {
				console.error('Failed to create document:', err)
				setValidationError('Failed to create document. Please try again.')
			}
		} finally {
			setActionLoading(false)
			currentRequestRef.current = null
		}
	}

	const openCreateDocumentModal = (workspace: Workspace) => {
		setSelectedWorkspace(workspace)
		setNewDocumentName('New Document')
		setValidationError(null)
		setShowCreateDocumentModal(true)
	}

	const handleCloseCreateDocumentModal = () => {
		if (currentRequestRef.current) {
			currentRequestRef.current.abort()
		}
		setShowCreateDocumentModal(false)
		setNewDocumentName('')
		setValidationError(null)
		setSelectedWorkspace(null)
		setActionLoading(false)
	}

	// Keyboard handling for document creation modal
	useEffect(() => {
		if (!showCreateDocumentModal) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				handleCloseCreateDocumentModal()
			} else if (e.key === 'Enter' && newDocumentName.trim() && !actionLoading) {
				e.preventDefault()
				handleCreateDocument()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [showCreateDocumentModal, newDocumentName, actionLoading])

	// Select text when document creation modal opens
	useEffect(() => {
		if (showCreateDocumentModal && documentNameInputRef.current) {
			// Use setTimeout to ensure the input is fully rendered and focused
			setTimeout(() => {
				documentNameInputRef.current?.select()
			}, 0)
		}
	}, [showCreateDocumentModal])

	// Document operation handlers
	const handleDocumentRename = async (workspaceId: string, documentId: string, newName: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName }),
			})

			const data = await response.json()

			if (data.success) {
				// Invalidate to trigger refetch
				queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
			} else {
				alert(data.error?.message || 'Failed to rename document')
			}
		} catch (err) {
			console.error('Failed to rename document:', err)
			alert('Failed to rename document')
		}
	}

	const handleDocumentDuplicate = async (workspaceId: string, documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}/duplicate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			})

			const data = await response.json()

			if (!data.success) {
				alert(data.error?.message || 'Failed to duplicate document')
			}
			// Realtime subscription will handle adding the new document
		} catch (err) {
			console.error('Failed to duplicate document:', err)
			alert('Failed to duplicate document')
		}
	}

	const handleDocumentArchive = async (workspaceId: string, documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_archived: true }),
			})

			const data = await response.json()

			if (!data.success) {
				alert(data.error?.message || 'Failed to archive document')
			}
			// Realtime subscription will handle the update
		} catch (err) {
			console.error('Failed to archive document:', err)
			alert('Failed to archive document')
		}
	}

	const handleDocumentRestore = async (workspaceId: string, documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_archived: false }),
			})

			const data = await response.json()

			if (!data.success) {
				alert(data.error?.message || 'Failed to restore document')
			}
			// Realtime subscription will handle the update
		} catch (err) {
			console.error('Failed to restore document:', err)
			alert('Failed to restore document')
		}
	}

	const handleDocumentDelete = async (workspaceId: string, documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'DELETE',
			})

			const data = await response.json()

			if (!data.success) {
				alert(data.error?.message || 'Failed to delete document')
			}
			// Realtime subscription will handle the deletion
		} catch (err) {
			console.error('Failed to delete document:', err)
			alert('Failed to delete document')
		}
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
							{dashboardData.workspaces.map(({ workspace, documents, folders, userRole }) => {
								const isExpanded = expandedWorkspaces.has(workspace.id)
								const isOwner = workspace.owner_id === userId
								const canEdit = userRole === 'owner' || userRole === 'member'
								const canDelete = userRole === 'owner'

								return (
									<div
										key={workspace.id}
										data-testid={`workspace-item-${workspace.id}`}
										className="border border-foreground/10 rounded-md overflow-hidden"
									>
										{/* Workspace Header */}
										<div className="flex items-center justify-between p-3 bg-foreground/5">
											<div className="flex-1 flex items-center gap-2">
												<button
													onClick={() => toggleWorkspace(workspace.id)}
													className="text-sm hover:bg-foreground/10 rounded px-1"
													data-testid={`toggle-workspace-${workspace.name
														.toLowerCase()
														.replace(/\s+/g, '-')
														.replace(/[^a-z0-9-]/g, '')}`}
													aria-label="Toggle workspace"
												>
													{isExpanded ? '▼' : '▶'}
												</button>
												<Link
													href={`/workspace/${workspace.id}`}
													className="flex-1 hover:opacity-80"
													data-testid={`workspace-card-${workspace.id}`}
												>
													<h3 className="font-medium text-sm">{workspace.name}</h3>
													<p className="text-xs text-foreground/60">
														{workspace.is_private ? 'Private' : 'Shared'}
													</p>
												</Link>
											</div>
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
												<div>
													<h4 className="text-xs font-semibold text-foreground/60 mb-1">
														Documents
													</h4>
													<div className="space-y-1">
														{documents.map((doc) => (
															<div
																key={doc.id}
																className="group flex items-center justify-between px-2 py-1 text-sm rounded hover:bg-foreground/5"
																data-testid={`document-${doc.id}`}
															>
																<Link
																	href={`/d/${doc.id}`}
																	className="flex-1 flex items-center gap-1"
																>
																	📄 {doc.name}
																</Link>
																<div
																	className="opacity-0 group-hover:opacity-100 transition-opacity"
																	onClick={(e) => e.stopPropagation()}
																>
																	<DocumentActions
																		document={doc}
																		onRename={(newName) =>
																			handleDocumentRename(workspace.id, doc.id, newName)
																		}
																		onDuplicate={() =>
																			handleDocumentDuplicate(workspace.id, doc.id)
																		}
																		onArchive={() => handleDocumentArchive(workspace.id, doc.id)}
																		onRestore={() => handleDocumentRestore(workspace.id, doc.id)}
																		onDelete={() => handleDocumentDelete(workspace.id, doc.id)}
																		canEdit={canEdit}
																		canDelete={canDelete}
																	/>
																</div>
															</div>
														))}
														{/* New Document button - show for non-private workspaces or workspace owners */}
														{(!workspace.is_private || isOwner) && (
															<button
																onClick={() => openCreateDocumentModal(workspace)}
																data-testid={`create-document-${workspace.id}`}
																className="w-full px-2 py-1 text-sm text-left rounded hover:bg-foreground/5 text-foreground/60 hover:text-foreground flex items-center gap-1"
															>
																<span className="text-xs">+</span> New Document
															</button>
														)}
													</div>
												</div>

												{/* Empty state for folders */}
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
								if (!newWorkspaceName.trim()) {
									setValidationError('Workspace name is required')
								}
							}}
							placeholder="Enter workspace name"
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

			{/* Create Document Modal */}
			{showCreateDocumentModal && selectedWorkspace && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
					<div className="bg-background rounded-lg p-6 max-w-md w-full border border-foreground/20">
						<h3 className="text-xl font-semibold mb-4">
							Create Document in {selectedWorkspace.name}
						</h3>
						<input
							ref={documentNameInputRef}
							type="text"
							value={newDocumentName}
							onChange={(e) => {
								setNewDocumentName(e.target.value)
								if (validationError) setValidationError(null)
							}}
							placeholder="Document name"
							data-testid="document-name-input"
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
								onClick={handleCloseCreateDocumentModal}
								className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5"
								disabled={actionLoading}
							>
								Cancel
							</button>
							<button
								onClick={handleCreateDocument}
								data-testid="confirm-create-document"
								className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
								disabled={actionLoading || !newDocumentName.trim()}
							>
								{actionLoading ? 'Creating...' : 'Create'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
