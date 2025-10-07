'use client'

import { DocumentListItem } from '@/components/documents/DocumentListItem'
import { EmptyDocumentList } from '@/components/documents/EmptyDocumentList'
import { Document, Folder, Workspace } from '@/lib/api/types'
import { getBrowserClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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
	const [documents, setDocuments] = useState(initialDocuments)
	const [isCreating, setIsCreating] = useState(false)
	const [selectedFolder, _setSelectedFolder] = useState<string | null>(null)

	// Subscribe to realtime updates for documents
	useEffect(() => {
		const supabase = getBrowserClient()

		const channel = supabase
			.channel(`workspace-documents-${workspace.id}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'documents',
					filter: `workspace_id=eq.${workspace.id}`,
				},
				(payload) => {
					const newDoc = payload.new as Document
					if (!newDoc.is_archived) {
						setDocuments((prev) => [newDoc, ...prev])
					}
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'documents',
					filter: `workspace_id=eq.${workspace.id}`,
				},
				(payload) => {
					const updatedDoc = payload.new as Document
					setDocuments((prev) => {
						// Remove if archived
						if (updatedDoc.is_archived) {
							return prev.filter((doc) => doc.id !== updatedDoc.id)
						}
						// Update existing document
						return prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
					})
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'DELETE',
					schema: 'public',
					table: 'documents',
					filter: `workspace_id=eq.${workspace.id}`,
				},
				(payload) => {
					setDocuments((prev) => prev.filter((doc) => doc.id !== payload.old.id))
				}
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [workspace.id])

	// Filter documents by selected folder
	const filteredDocuments = selectedFolder
		? documents.filter((doc) => doc.folder_id === selectedFolder)
		: documents.filter((doc) => !doc.folder_id) // Root documents

	const activeDocuments = filteredDocuments.filter((doc) => !doc.is_archived)

	const handleCreateDocument = async () => {
		const name = window.prompt('Enter document name:')
		if (!name || !name.trim()) return

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
			setDocuments((prev) => [newDocument, ...prev])
			// Navigate to the new document
			router.push(`/d/${newDocument.id}`)
		} catch (err) {
			alert(
				`Error creating document: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`
			)
		} finally {
			setIsCreating(false)
		}
	}

	const handleRenameDocument = async (documentId: string, newName: string) => {
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

			const { data: updatedDocument } = await response.json()
			setDocuments((prev) => prev.map((doc) => (doc.id === documentId ? updatedDocument : doc)))
		} catch (err) {
			alert(
				`Error renaming document: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`
			)
		}
	}

	const handleDuplicateDocument = async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}/duplicate`, {
				method: 'POST',
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to duplicate document')
			}

			const { data: duplicatedDocument } = await response.json()
			setDocuments((prev) => [duplicatedDocument, ...prev])
		} catch (err) {
			alert(
				`Error duplicating document: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`
			)
		}
	}

	const handleArchiveDocument = async (documentId: string) => {
		try {
			// Optimistically remove document from UI immediately
			// This ensures the UI updates even if realtime UPDATE events aren't received
			setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))

			const response = await fetch(`/api/documents/${documentId}/archive`, {
				method: 'POST',
			})

			if (!response.ok) {
				const error = await response.json()
				// Revert optimistic update on error by refetching documents
				const refetchResponse = await fetch(`/api/workspaces/${workspace.id}/documents`)
				if (refetchResponse.ok) {
					const refetchData = await refetchResponse.json()
					if (refetchData.success && refetchData.data) {
						setDocuments(refetchData.data)
					}
				}
				throw new Error(error.message || 'Failed to archive document')
			}
			// Realtime subscription will keep UI in sync if events are received
		} catch (err) {
			// Revert optimistic update on error by refetching documents
			try {
				const refetchResponse = await fetch(`/api/workspaces/${workspace.id}/documents`)
				if (refetchResponse.ok) {
					const refetchData = await refetchResponse.json()
					if (refetchData.success && refetchData.data) {
						setDocuments(refetchData.data)
					}
				}
			} catch (refetchErr) {
				console.error('Failed to refetch documents:', refetchErr)
			}
			alert(
				`Error archiving document: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`
			)
		}
	}

	const handleRestoreDocument = async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}/restore`, {
				method: 'POST',
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to restore document')
			}

			const { data: restoredDocument } = await response.json()
			setDocuments((prev) => prev.map((doc) => (doc.id === documentId ? restoredDocument : doc)))
		} catch (err) {
			alert(
				`Error restoring document: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`
			)
		}
	}

	const handleDeleteDocument = async (_documentId: string) => {
		// For M2, we only support soft delete (archive)
		// Hard delete will be implemented in DOC-05
		alert('Permanent deletion will be available in a future update')
	}

	return (
		<div className="flex h-full flex-col">
			{/* Documents header */}
			<div className="flex items-center justify-between border-b px-6 py-4">
				<div className="flex items-center gap-4">
					<h2 className="text-xl font-semibold">
						{selectedFolder
							? folders.find((f) => f.id === selectedFolder)?.name || 'Documents'
							: 'Documents'}
					</h2>
					<span className="text-sm text-gray-500">
						{activeDocuments.length} document{activeDocuments.length !== 1 ? 's' : ''}
					</span>
				</div>
				<button
					onClick={handleCreateDocument}
					disabled={isCreating}
					className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isCreating ? 'Creating...' : '+ New Document'}
				</button>
			</div>

			{/* Documents list */}
			<div className="flex-1 overflow-y-auto">
				{activeDocuments.length === 0 ? (
					<EmptyDocumentList onCreateDocument={handleCreateDocument} canCreate={true} />
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
		</div>
	)
}
