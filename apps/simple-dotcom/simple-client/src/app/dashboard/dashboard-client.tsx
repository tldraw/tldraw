'use client'

import { Sidebar } from '@/components/sidebar/Sidebar'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PromptDialog } from '@/components/ui/prompt-dialog'
import { useDashboardRealtimeUpdates } from '@/hooks/useDashboardRealtimeUpdates'
import { Document, Folder, RecentDocument, User, Workspace, WorkspaceRole } from '@/lib/api/types'
import { getBrowserClient } from '@/lib/supabase/browser'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

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

type ModalState =
	| { type: 'idle' }
	| { type: 'create-workspace' }
	| { type: 'rename-workspace'; workspace: Workspace }
	| { type: 'delete-workspace'; workspace: Workspace }
	| { type: 'create-document'; workspace: Workspace; folder?: Folder }

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

	// Single modal state machine
	const [modalState, setModalState] = useState<ModalState>({ type: 'idle' })
	const [actionLoading, setActionLoading] = useState(false)
	const [validationError, setValidationError] = useState<string | null>(null)

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

	// Modal handlers
	const closeModal = useCallback(() => {
		setModalState({ type: 'idle' })
		setValidationError(null)
		setActionLoading(false)
	}, [])

	const handleSignOut = useCallback(async () => {
		const supabase = getBrowserClient()
		await supabase.auth.signOut()
		router.push('/login')
		router.refresh() // Refresh server components
	}, [router])

	const handleCreateWorkspace = useCallback(
		async (name: string) => {
			if (!name.trim()) {
				setValidationError('Workspace name is required')
				return
			}

			try {
				setActionLoading(true)
				setValidationError(null)

				const response = await fetch('/api/workspaces', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: name.trim() }),
				})

				const data = await response.json()

				if (data.success && data.data) {
					await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
					setModalState({ type: 'idle' })
					setValidationError(null)
				} else {
					setValidationError(data.error?.message || 'Failed to create workspace')
				}
			} catch (err) {
				console.error('Failed to create workspace:', err)
				setValidationError('Failed to create workspace. Please try again.')
			} finally {
				setActionLoading(false)
			}
		},
		[queryClient, userId]
	)

	const handleRenameWorkspace = useCallback(
		async (name: string) => {
			if (modalState.type !== 'rename-workspace' || !name.trim()) return

			try {
				setActionLoading(true)
				const response = await fetch(`/api/workspaces/${modalState.workspace.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: name.trim() }),
				})

				const data = await response.json()

				if (data.success && data.data) {
					await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
					setModalState({ type: 'idle' })
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
		},
		[modalState, queryClient, userId]
	)

	const handleDeleteWorkspace = useCallback(async () => {
		if (modalState.type !== 'delete-workspace') return

		try {
			setActionLoading(true)
			const response = await fetch(`/api/workspaces/${modalState.workspace.id}`, {
				method: 'DELETE',
			})

			const data = await response.json()

			if (data.success) {
				await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
				setModalState({ type: 'idle' })
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
	}, [modalState, queryClient, userId])

	const handleCreateDocument = useCallback(
		async (name: string) => {
			if (modalState.type !== 'create-document' || !name.trim()) {
				setValidationError('Document name is required')
				return
			}

			try {
				setActionLoading(true)
				setValidationError(null)

				const requestBody: { name: string; folder_id?: string } = { name: name.trim() }

				// Include folder_id if a folder was specified
				if (modalState.folder?.id) {
					requestBody.folder_id = modalState.folder.id
				}

				const response = await fetch(`/api/workspaces/${modalState.workspace.id}/documents`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(requestBody),
				})

				const data = await response.json()

				if (data.success && data.data) {
					// Document will be added via realtime subscription
					setModalState({ type: 'idle' })
					setValidationError(null)
				} else {
					setValidationError(data.error?.message || 'Failed to create document')
				}
			} catch (err) {
				console.error('Failed to create document:', err)
				setValidationError('Failed to create document. Please try again.')
			} finally {
				setActionLoading(false)
			}
		},
		[modalState]
	)

	const displayName = userProfile?.display_name || userProfile?.name || 'User'

	return (
		<div className="fixed inset-0 flex bg-background" data-testid="dashboard">
			{/* New Sidebar Component */}
			<Sidebar
				workspaces={dashboardData.workspaces}
				recentDocuments={dashboardData.recentDocuments}
				userProfile={userProfile}
				userId={userId}
				onInvalidate={handleRealtimeChange}
				onOpenRenameModal={(ws) => setModalState({ type: 'rename-workspace', workspace: ws })}
				onOpenDeleteModal={(ws) => setModalState({ type: 'delete-workspace', workspace: ws })}
				onOpenCreateDocumentModal={(ws, folder) =>
					setModalState({ type: 'create-document', workspace: ws, folder: folder })
				}
			/>

			{/* Main Content Area */}
			<div className="flex-1 overflow-y-auto">
				<div className="p-8">
					<div className="mx-auto max-w-4xl">
						<div className="flex items-center justify-between mb-8">
							<h1 className=" font-bold">Dashboard</h1>
							<div className="flex items-center gap-3">
								<ThemeToggle />
								<Button variant="outline" asChild>
									<Link href="/profile">Profile</Link>
								</Button>
								<Button variant="outline" onClick={handleSignOut} data-testid="logout-button">
									Sign out
								</Button>
							</div>
						</div>

						<div className="rounded-lg border border-foreground/20 p-6">
							<h2 className=" font-semibold mb-4">Welcome, {displayName}!</h2>

							{/* Recent Documents */}
							{dashboardData.recentDocuments.length > 0 && (
								<div className="mt-6">
									<h3 className=" font-semibold mb-3">Recent Documents</h3>
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
														<p className=" text-foreground/60">{recent.workspace_name}</p>
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
			</div>

			{/* Create Workspace Modal */}
			<PromptDialog
				open={modalState.type === 'create-workspace'}
				onOpenChange={(open) => {
					if (!open) closeModal()
				}}
				title="Create New Workspace"
				label="Workspace Name"
				placeholder="Enter workspace name"
				defaultValue="New Workspace"
				onConfirm={handleCreateWorkspace}
				confirmText="Create"
				loading={actionLoading}
				validationError={validationError ?? undefined}
			/>

			{/* Rename Workspace Modal */}
			<PromptDialog
				open={modalState.type === 'rename-workspace'}
				onOpenChange={(open) => {
					if (!open) closeModal()
				}}
				title="Rename Workspace"
				label="Workspace Name"
				placeholder="New workspace name"
				defaultValue={modalState.type === 'rename-workspace' ? modalState.workspace.name : ''}
				onConfirm={handleRenameWorkspace}
				confirmText="Rename"
				loading={actionLoading}
				inputTestId="rename-workspace-input"
				confirmButtonTestId="confirm-rename-workspace"
				cancelButtonTestId="cancel-rename-workspace"
			/>

			{/* Delete Workspace Modal */}
			<ConfirmDialog
				open={modalState.type === 'delete-workspace'}
				onOpenChange={(open) => {
					if (!open) closeModal()
				}}
				title="Delete Workspace"
				description={`Are you sure you want to delete "${modalState.type === 'delete-workspace' ? modalState.workspace.name : ''}"? This action will soft-delete the workspace and remove it from your workspace list. The workspace can be restored later from the archive view.`}
				onConfirm={handleDeleteWorkspace}
				confirmText="Delete"
				destructive
				loading={actionLoading}
				confirmButtonTestId="confirm-delete-workspace"
				cancelButtonTestId="cancel-delete-workspace"
			/>

			{/* Create Document Modal */}
			<PromptDialog
				open={modalState.type === 'create-document'}
				onOpenChange={(open) => {
					if (!open) closeModal()
				}}
				title={`Create Document in ${modalState.type === 'create-document' ? modalState.workspace.name : ''}${modalState.type === 'create-document' && modalState.folder ? ` in ${modalState.folder.name}` : ''}`}
				label="Document Name"
				placeholder="Document name"
				defaultValue="New Document"
				onConfirm={handleCreateDocument}
				confirmText="Create"
				loading={actionLoading}
				validationError={validationError ?? undefined}
			/>
		</div>
	)
}
