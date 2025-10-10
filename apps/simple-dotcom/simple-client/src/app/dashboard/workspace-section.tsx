'use client'

import { DocumentActions } from '@/components/documents/DocumentActions'
import { Document, Folder, Workspace, WorkspaceRole } from '@/lib/api/types'
import Link from 'next/link'
import { useCallback } from 'react'
import { toast } from 'sonner'

interface WorkspaceSectionProps {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
	userRole: WorkspaceRole
	userId: string
	isExpanded: boolean
	onToggle: () => void
	onOpenRenameModal: (workspace: Workspace) => void
	onOpenDeleteModal: (workspace: Workspace) => void
	onOpenCreateDocumentModal: (workspace: Workspace) => void
	onInvalidate: () => void
}

export function WorkspaceSection({
	workspace,
	documents,
	folders,
	userRole,
	userId,
	isExpanded,
	onToggle,
	onOpenRenameModal,
	onOpenDeleteModal,
	onOpenCreateDocumentModal,
	onInvalidate,
}: WorkspaceSectionProps) {
	// Document operation handlers
	const handleDocumentRename = useCallback(
		async (documentId: string, newName: string) => {
			try {
				const response = await fetch(`/api/documents/${documentId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: newName }),
				})

				const data = await response.json()

				if (data.success) {
					onInvalidate()
					toast.success('Document renamed successfully')
				} else {
					toast.error(data.error?.message || 'Failed to rename document')
				}
			} catch (err) {
				console.error('Failed to rename document:', err)
				toast.error('Failed to rename document')
			}
		},
		[onInvalidate]
	)

	const handleDocumentDuplicate = useCallback(async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}/duplicate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			})

			const data = await response.json()

			if (!data.success) {
				toast.error(data.error?.message || 'Failed to duplicate document')
			} else {
				toast.success('Document duplicated successfully')
			}
			// Realtime subscription will handle adding the new document
		} catch (err) {
			console.error('Failed to duplicate document:', err)
			toast.error('Failed to duplicate document')
		}
	}, [])

	const handleDocumentArchive = useCallback(async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_archived: true }),
			})

			const data = await response.json()

			if (!data.success) {
				toast.error(data.error?.message || 'Failed to archive document')
			} else {
				toast.success('Document archived successfully')
			}
			// Realtime subscription will handle the update
		} catch (err) {
			console.error('Failed to archive document:', err)
			toast.error('Failed to archive document')
		}
	}, [])

	const handleDocumentRestore = useCallback(async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_archived: false }),
			})

			const data = await response.json()

			if (!data.success) {
				toast.error(data.error?.message || 'Failed to restore document')
			} else {
				toast.success('Document restored successfully')
			}
			// Realtime subscription will handle the update
		} catch (err) {
			console.error('Failed to restore document:', err)
			toast.error('Failed to restore document')
		}
	}, [])

	const handleDocumentDelete = useCallback(async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'DELETE',
			})

			const data = await response.json()

			if (!data.success) {
				toast.error(data.error?.message || 'Failed to delete document')
			} else {
				toast.success('Document deleted successfully')
			}
			// Realtime subscription will handle the deletion
		} catch (err) {
			console.error('Failed to delete document:', err)
			toast.error('Failed to delete document')
		}
	}, [])

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
						onClick={onToggle}
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
							onClick={() => onOpenRenameModal(workspace)}
							data-testid={`rename-workspace-${workspace.id}`}
							className="rounded px-2 py-1 text-xs hover:bg-foreground/10"
						>
							Rename
						</button>
						<button
							onClick={() => onOpenDeleteModal(workspace)}
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
				<div className="p-3 space-y-2" data-testid={`workspace-content-${workspace.id}`}>
					{/* Folders */}
					{folders.length > 0 && (
						<div>
							<h4 className="text-xs font-semibold text-foreground/60 mb-1">Folders</h4>
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
						<h4 className="text-xs font-semibold text-foreground/60 mb-1">Documents</h4>
						<div className="space-y-1">
							{documents.map((doc) => (
								<div
									key={doc.id}
									className="group flex items-center justify-between px-2 py-1 text-sm rounded hover:bg-foreground/5"
									data-testid={`document-${doc.id}`}
								>
									<Link href={`/d/${doc.id}`} className="flex-1 flex items-center gap-1">
										📄 {doc.name}
									</Link>
									<div
										className="opacity-0 group-hover:opacity-100 transition-opacity"
										onClick={(e) => e.stopPropagation()}
									>
										<DocumentActions
											document={doc}
											onRename={(newName) => handleDocumentRename(doc.id, newName)}
											onDuplicate={() => handleDocumentDuplicate(doc.id)}
											onArchive={() => handleDocumentArchive(doc.id)}
											onRestore={() => handleDocumentRestore(doc.id)}
											onDelete={() => handleDocumentDelete(doc.id)}
											canEdit={canEdit}
											canDelete={canDelete}
										/>
									</div>
								</div>
							))}
							{/* New Document button - show for non-private workspaces or workspace owners */}
							{(!workspace.is_private || isOwner) && (
								<button
									onClick={() => onOpenCreateDocumentModal(workspace)}
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
}
