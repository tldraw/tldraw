'use client'

import { DocumentListItem } from '@/components/documents/DocumentListItem'
import { EmptyDocumentList } from '@/components/documents/EmptyDocumentList'
import { MoveDocumentDialog } from '@/components/documents/MoveDocumentDialog'
import { PromptDialog } from '@/components/ui/prompt-dialog'
import { useWorkspaceRealtimeUpdates } from '@/hooks/useWorkspaceRealtimeUpdates'
import { Document, Folder, Workspace } from '@/lib/api/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

interface WorkspaceDocumentsClientProps {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
	role: 'owner' | 'member'
	isOwner: boolean
	userId: string
}

export default function WorkspaceDocumentsClient({
	workspace,
	documents: initialDocuments,
	folders,
	isOwner,
}: WorkspaceDocumentsClientProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const [isCreating, setIsCreating] = useState(false)
	const [selectedFolder, _setSelectedFolder] = useState<string | null>(null)
	const [showCreateDialog, setShowCreateDialog] = useState(false)
	const [showMoveDialog, setShowMoveDialog] = useState(false)
	const [documentToMove, setDocumentToMove] = useState<Document | null>(null)

	// Fetch documents data with React Query
	// Hybrid approach: Realtime for instant updates + polling for reliability
	const { data: documents = initialDocuments } = useQuery<Document[]>({
		queryKey: ['workspace-documents', workspace.id],
		queryFn: async () => {
			const response = await fetch(`/api/workspaces/${workspace.id}/documents`)
			const result = await response.json()
			if (!result.success) {
				throw new Error(result.error?.message || 'Failed to fetch documents')
			}
			return result.data
		},
		initialData: initialDocuments,
		staleTime: 1000 * 10, // 10 seconds - shorter to catch missed realtime events
		refetchInterval: 1000 * 15, // Poll every 15 seconds as fallback
		refetchOnMount: true, // Refetch when returning to documents page
		refetchOnReconnect: true, // Refetch when connection restored
	})

	// Memoize onChange to prevent subscription reconnects
	const handleRealtimeChange = useCallback(() => {
		// Invalidate queries to trigger refetch when any workspace event is received
		queryClient.invalidateQueries({ queryKey: ['workspace-documents', workspace.id] })
	}, [queryClient, workspace.id])

	// Enable realtime subscriptions using broadcast pattern
	// This follows the documented hybrid realtime strategy (broadcast + polling)
	useWorkspaceRealtimeUpdates(workspace.id, {
		onChange: handleRealtimeChange,
		enabled: true,
	})

	// Filter documents by selected folder
	const filteredDocuments = selectedFolder
		? documents.filter((doc) => doc.folder_id === selectedFolder)
		: documents.filter((doc) => !doc.folder_id) // Root documents

	const activeDocuments = filteredDocuments.filter((doc) => !doc.is_archived)

	const handleCreateDocument = useCallback(
		async (name: string) => {
			setIsCreating(true)
			try {
				const response = await fetch(`/api/workspaces/${workspace.id}/documents`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: name.trim(),
						folder_id: selectedFolder,
					}),
				})

				if (!response.ok) {
					const error = await response.json()
					throw new Error(error.message || 'Failed to create document')
				}

				const { data: newDocument } = await response.json()
				// Invalidate queries to refetch documents with the new one
				await queryClient.invalidateQueries({ queryKey: ['workspace-documents', workspace.id] })
				// Close dialog before navigation
				setShowCreateDialog(false)
				// Navigate to the new document
				router.push(`/d/${newDocument.id}`)
			} catch (err) {
				alert(
					`Error creating document: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`
				)
			} finally {
				setIsCreating(false)
			}
		},
		[workspace.id, selectedFolder, queryClient, router]
	)

	const handleRenameDocument = useCallback(async (documentId: string, newName: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName }),
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to rename document')
			}

			// No need to handle the response - React Query will refetch via broadcast event
			// The server broadcasts 'document.updated' which triggers query invalidation
		} catch (err) {
			alert(
				`Error renaming document: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`
			)
		}
	}, [])

	const handleDuplicateDocument = useCallback(async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}/duplicate`, {
				method: 'POST',
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to duplicate document')
			}

			// No need to handle the response - React Query will refetch via broadcast event
			// The server broadcasts 'document.created' which triggers query invalidation
		} catch (err) {
			alert(
				`Error duplicating document: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`
			)
		}
	}, [])

	const handleArchiveDocument = useCallback(async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}/archive`, {
				method: 'POST',
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to archive document')
			}
			// The server broadcasts 'document.archived' which triggers query invalidation
			// React Query will automatically refetch and update the UI
		} catch (err) {
			alert(
				`Error archiving document: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`
			)
		}
	}, [])

	const handleRestoreDocument = useCallback(async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}/restore`, {
				method: 'POST',
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to restore document')
			}

			// No need to handle the response - React Query will refetch via broadcast event
			// The server broadcasts 'document.restored' which triggers query invalidation
		} catch (err) {
			alert(
				`Error restoring document: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`
			)
		}
	}, [])

	const handleDeleteDocument = useCallback(async (_documentId: string) => {
		// For M2, we only support soft delete (archive)
		// Hard delete will be implemented in DOC-05
		alert('Permanent deletion will be available in a future update')
	}, [])

	const handleMoveDocument = useCallback((document: Document) => {
		setDocumentToMove(document)
		setShowMoveDialog(true)
	}, [])

	const handleConfirmMove = useCallback(
		async (folderId: string | null) => {
			if (!documentToMove) return

			try {
				const response = await fetch(`/api/documents/${documentToMove.id}/move`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ folder_id: folderId }),
				})

				if (!response.ok) {
					const error = await response.json()
					throw new Error(error.message || 'Failed to move document')
				}

				// No need to handle the response - React Query will refetch via broadcast event
				// The server broadcasts 'document.moved' which triggers query invalidation
			} catch (err) {
				alert(
					`Error moving document: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`
				)
				throw err
			}
		},
		[documentToMove]
	)

	return (
		<div className="flex h-full flex-col">
			{/* Documents header */}
			<div className="flex items-center justify-between border-b px-6 py-4">
				<div className="flex items-center gap-4">
					<h2 className=" font-semibold">
						{selectedFolder
							? folders.find((f) => f.id === selectedFolder)?.name || 'Documents'
							: 'Documents'}
					</h2>
					<span className=" text-gray-500">
						{activeDocuments.length} document{activeDocuments.length !== 1 ? 's' : ''}
					</span>
				</div>
				<button
					onClick={() => setShowCreateDialog(true)}
					disabled={isCreating}
					className="rounded-md bg-blue-600 px-4 py-2  text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isCreating ? 'Creating...' : '+ New Document'}
				</button>
			</div>

			{/* Documents list */}
			<div className="flex-1 overflow-y-auto">
				{activeDocuments.length === 0 ? (
					<EmptyDocumentList onCreateDocument={() => setShowCreateDialog(true)} canCreate={true} />
				) : (
					<div className="divide-y divide-gray-200">
						{activeDocuments.map((document) => (
							<DocumentListItem
								key={document.id}
								document={{
									...document,
									created_by: document.creator,
								}}
								onClick={() => router.push(`/d/${document.id}`)}
								onRename={(newName) => handleRenameDocument(document.id, newName)}
								onDuplicate={() => handleDuplicateDocument(document.id)}
								onMove={() => handleMoveDocument(document)}
								onArchive={() => handleArchiveDocument(document.id)}
								onRestore={() => handleRestoreDocument(document.id)}
								onDelete={isOwner ? () => handleDeleteDocument(document.id) : undefined}
								canEdit={true} // All members can edit
								canDelete={isOwner} // Only owners can delete
							/>
						))}
					</div>
				)}
			</div>
			<PromptDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				title="Create New Document"
				label="Document Name"
				placeholder="Enter document name"
				onConfirm={handleCreateDocument}
				confirmText="Create"
				loading={isCreating}
			/>
			{documentToMove && (
				<MoveDocumentDialog
					open={showMoveDialog}
					onOpenChange={setShowMoveDialog}
					document={documentToMove}
					workspaceId={workspace.id}
					onMove={handleConfirmMove}
				/>
			)}
		</div>
	)
}
