'use client'

import { DocumentListItem } from '@/components/documents/DocumentListItem'
import { EmptyDocumentList } from '@/components/documents/EmptyDocumentList'
import { Document, Folder, Workspace } from '@/lib/api/types'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
	role,
	isOwner,
	userId,
}: WorkspaceDocumentsClientProps) {
	const router = useRouter()
	const [documents, setDocuments] = useState(initialDocuments)
	const [isCreating, setIsCreating] = useState(false)
	const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

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
		} catch (error: any) {
			alert(`Error creating document: ${error.message}`)
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
		} catch (error: any) {
			alert(`Error renaming document: ${error.message}`)
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
		} catch (error: any) {
			alert(`Error duplicating document: ${error.message}`)
		}
	}

	const handleArchiveDocument = async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.message || 'Failed to archive document')
			}

			// Update document to archived state
			setDocuments((prev) =>
				prev.map((doc) =>
					doc.id === documentId
						? { ...doc, is_archived: true, archived_at: new Date().toISOString() }
						: doc
				)
			)
		} catch (error: any) {
			alert(`Error archiving document: ${error.message}`)
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
		} catch (error: any) {
			alert(`Error restoring document: ${error.message}`)
		}
	}

	const handleDeleteDocument = async (documentId: string) => {
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
