'use client'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PromptDialog } from '@/components/ui/prompt-dialog'
import { useDashboardRealtimeUpdates } from '@/hooks/useDashboardRealtimeUpdates'
import { Document, Folder, RecentDocument, User, Workspace, WorkspaceRole } from '@/lib/api/types'
import { getBrowserClient } from '@/lib/supabase/browser'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { WorkspaceSection } from './workspace-section'

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

	// Fetch dashboard data with React Query for recent documents only
	// Individual WorkspaceSection components will manage their own queries
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
			toast.success(message, { duration: 5000 })
			sessionStorage.removeItem('leaveWorkspaceSuccess')
		}
	}, [])

	// Subscribe to realtime updates for all workspaces
	const workspaceIds = dashboardData.workspaces.map((w) => w.workspace.id)
	const handleRealtimeChange = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
	}, [queryClient, userId])

	useDashboardRealtimeUpdates(userId, workspaceIds, {
		onChange: handleRealtimeChange,
		enabled: true,
	})

	// Define handlers before useEffect to avoid dependency issues
	const handleCloseCreateModal = useCallback(() => {
		// Cancel any pending request
		if (currentRequestRef.current) {
			currentRequestRef.current.abort()
		}
		setShowCreateModal(false)
		setNewWorkspaceName('')
		setValidationError(null)
		setActionLoading(false)
	}, [])

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

	const handleSignOut = useCallback(async () => {
		const supabase = getBrowserClient()
		await supabase.auth.signOut()
		router.push('/login')
		router.refresh() // Refresh server components
	}, [router])

	const handleCreateWorkspace = useCallback(async () => {
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
				setNewWorkspaceName('')
				setValidationError(null)
				setActionLoading(false)
				currentRequestRef.current = null
				// Modal will be closed automatically by PromptDialog after this function returns
			} else {
				// Show error in modal, keep it open
				setValidationError(data.error?.message || 'Failed to create workspace')
				setActionLoading(false)
				currentRequestRef.current = null
			}
		} catch (err: any) {
			// Don't show error if request was aborted
			if (err.name !== 'AbortError') {
				console.error('Failed to create workspace:', err)
				setValidationError('Failed to create workspace. Please try again.')
			}
			setActionLoading(false)
			currentRequestRef.current = null
		}
	}, [newWorkspaceName, queryClient, userId])

	const handleRenameWorkspace = useCallback(async () => {
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
				toast.success('Workspace renamed successfully')
			} else {
				toast.error(data.error?.message || 'Failed to rename workspace')
			}
		} catch (err) {
			console.error('Failed to rename workspace:', err)
			toast.error('Failed to rename workspace')
		} finally {
			setActionLoading(false)
		}
	}, [selectedWorkspace, newWorkspaceName, queryClient, userId])

	const handleDeleteWorkspace = useCallback(async () => {
		if (!selectedWorkspace) return

		try {
			setActionLoading(true)
			const response = await fetch(`/api/workspaces/${selectedWorkspace.id}`, {
				method: 'DELETE',
			})

			const data = await response.json()

			if (data.success) {
				// Wait for refetch to complete before closing modal
				// This ensures the workspace is removed from the list before re-subscribing
				await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
				setShowDeleteModal(false)
				setSelectedWorkspace(null)
				toast.success('Workspace deleted successfully')
			} else {
				toast.error(data.error?.message || 'Failed to delete workspace')
			}
		} catch (err) {
			console.error('Failed to delete workspace:', err)
			toast.error('Failed to delete workspace')
		} finally {
			setActionLoading(false)
		}
	}, [selectedWorkspace, queryClient, userId])

	const openRenameModal = (workspace: Workspace) => {
		setSelectedWorkspace(workspace)
		setNewWorkspaceName(workspace.name)
		setShowRenameModal(true)
	}

	const openDeleteModal = (workspace: Workspace) => {
		setSelectedWorkspace(workspace)
		setShowDeleteModal(true)
	}

	const handleCreateDocument = useCallback(async () => {
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
	}, [selectedWorkspace, newDocumentName])

	const openCreateDocumentModal = (workspace: Workspace) => {
		setSelectedWorkspace(workspace)
		setNewDocumentName('New Document')
		setValidationError(null)
		setShowCreateDocumentModal(true)
	}

	const handleCloseCreateDocumentModal = useCallback(() => {
		if (currentRequestRef.current) {
			currentRequestRef.current.abort()
		}
		setShowCreateDocumentModal(false)
		setNewDocumentName('')
		setValidationError(null)
		setSelectedWorkspace(null)
		setActionLoading(false)
	}, [])

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
							{dashboardData.workspaces.map(({ workspace, documents, folders, userRole }) => (
								<WorkspaceSection
									key={workspace.id}
									workspace={workspace}
									initialDocuments={documents}
									initialFolders={folders}
									userRole={userRole}
									userId={userId}
									isExpanded={expandedWorkspaces.has(workspace.id)}
									onToggle={() => toggleWorkspace(workspace.id)}
									onOpenRenameModal={openRenameModal}
									onOpenDeleteModal={openDeleteModal}
									onOpenCreateDocumentModal={openCreateDocumentModal}
								/>
							))}
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
			<PromptDialog
				open={showCreateModal}
				onOpenChange={(open) => {
					if (!open) handleCloseCreateModal()
				}}
				title="Create New Workspace"
				label="Workspace Name"
				placeholder="Enter workspace name"
				defaultValue={newWorkspaceName}
				onConfirm={async (name) => {
					if (!name.trim()) {
						setValidationError('Workspace name is required')
						return
					}

					try {
						setActionLoading(true)
						setValidationError(null)

						const abortController = new AbortController()
						currentRequestRef.current = abortController

						const response = await fetch('/api/workspaces', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ name: name.trim() }),
							signal: abortController.signal,
						})

						const data = await response.json()

						if (data.success && data.data) {
							await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
							setExpandedWorkspaces((prev) => new Set([...prev, data.data.id]))
							setNewWorkspaceName('')
							setValidationError(null)
							setActionLoading(false)
							currentRequestRef.current = null
							setShowCreateModal(false)
						} else {
							setValidationError(data.error?.message || 'Failed to create workspace')
							setActionLoading(false)
							currentRequestRef.current = null
						}
					} catch (err: any) {
						if (err.name !== 'AbortError') {
							console.error('Failed to create workspace:', err)
							setValidationError('Failed to create workspace. Please try again.')
						}
						setActionLoading(false)
						currentRequestRef.current = null
					}
				}}
				confirmText="Create"
				loading={actionLoading}
				validationError={validationError ?? undefined}
			/>

			{/* Rename Workspace Modal */}
			<PromptDialog
				open={showRenameModal && !!selectedWorkspace}
				onOpenChange={(open) => {
					if (!open) {
						setShowRenameModal(false)
						setNewWorkspaceName('')
						setSelectedWorkspace(null)
					}
				}}
				title="Rename Workspace"
				label="Workspace Name"
				placeholder="New workspace name"
				defaultValue={selectedWorkspace?.name || newWorkspaceName}
				onConfirm={async (name) => {
					if (!selectedWorkspace || !name.trim()) return

					try {
						setActionLoading(true)
						const response = await fetch(`/api/workspaces/${selectedWorkspace.id}`, {
							method: 'PATCH',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ name: name.trim() }),
						})

						const data = await response.json()

						if (data.success && data.data) {
							await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
							setActionLoading(false)
							setShowRenameModal(false)
							setNewWorkspaceName('')
							setSelectedWorkspace(null)
							toast.success('Workspace renamed successfully')
						} else {
							setActionLoading(false)
							toast.error(data.error?.message || 'Failed to rename workspace')
						}
					} catch (err) {
						console.error('Failed to rename workspace:', err)
						setActionLoading(false)
						toast.error('Failed to rename workspace')
					}
				}}
				confirmText="Rename"
				loading={actionLoading}
				inputTestId="rename-workspace-input"
				confirmButtonTestId="confirm-rename-workspace"
				cancelButtonTestId="cancel-rename-workspace"
			/>

			{/* Delete Workspace Modal */}
			<ConfirmDialog
				open={showDeleteModal && !!selectedWorkspace}
				onOpenChange={(open) => {
					if (!open) {
						setShowDeleteModal(false)
						setSelectedWorkspace(null)
					}
				}}
				title="Delete Workspace"
				description={`Are you sure you want to delete "${selectedWorkspace?.name}"? This action will soft-delete the workspace and remove it from your workspace list. The workspace can be restored later from the archive view.`}
				onConfirm={handleDeleteWorkspace}
				confirmText="Delete"
				destructive
				loading={actionLoading}
				confirmButtonTestId="confirm-delete-workspace"
				cancelButtonTestId="cancel-delete-workspace"
			/>

			{/* Create Document Modal */}
			<PromptDialog
				open={showCreateDocumentModal && !!selectedWorkspace}
				onOpenChange={(open) => {
					if (!open) handleCloseCreateDocumentModal()
				}}
				title={`Create Document in ${selectedWorkspace?.name || ''}`}
				label="Document Name"
				placeholder="Document name"
				defaultValue={newDocumentName}
				onConfirm={async (name) => {
					setNewDocumentName(name)
					await handleCreateDocument()
				}}
				confirmText="Create"
				loading={actionLoading}
				validationError={validationError ?? undefined}
			/>
		</div>
	)
}
