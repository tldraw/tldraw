'use client'

import { DocumentCard } from '@/components/documents/DocumentCard'
import { EmptyDocumentList } from '@/components/documents/EmptyDocumentList'
import { Document, Folder, Workspace } from '@/lib/api/types'
import { getBrowserClient } from '@/lib/supabase/browser'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface WorkspaceBrowserClientProps {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
	role: 'owner' | 'member'
	isOwner: boolean
	userId: string
}

export default function WorkspaceBrowserClient({
	workspace,
	documents: initialDocuments,
	folders,
	role,
	isOwner,
	userId,
}: WorkspaceBrowserClientProps) {
	const router = useRouter()
	const [documents, setDocuments] = useState<Document[]>(initialDocuments)
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [newDocumentName, setNewDocumentName] = useState('')
	const [actionLoading, setActionLoading] = useState(false)
	const [validationError, setValidationError] = useState<string | null>(null)
	const currentRequestRef = useRef<AbortController | null>(null)
	const documentNameInputRef = useRef<HTMLInputElement>(null)

	// Subscribe to realtime updates for documents
	useEffect(() => {
		const supabase = getBrowserClient()

		console.log('[Realtime] Setting up subscription for workspace:', workspace.id)

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
					console.log('[Realtime] Document INSERT:', payload)
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
					console.log('[Realtime] Document UPDATE:', payload)
					const updatedDoc = payload.new as Document
					setDocuments((prev) => {
						// Remove if archived
						if (updatedDoc.is_archived) {
							return prev.filter((doc) => doc.id !== updatedDoc.id)
						}
						// Update existing
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
					console.log('[Realtime] Document DELETE:', payload)
					setDocuments((prev) => prev.filter((doc) => doc.id !== payload.old.id))
				}
			)
			.subscribe((status, err) => {
				console.log('[Realtime] Subscription status:', status, err)
			})

		return () => {
			console.log('[Realtime] Cleaning up subscription')
			supabase.removeChannel(channel)
		}
	}, [workspace.id])

	const handleCloseCreateModal = () => {
		if (currentRequestRef.current) {
			currentRequestRef.current.abort()
		}
		setShowCreateModal(false)
		setNewDocumentName('')
		setValidationError(null)
		setActionLoading(false)
	}

	// Keyboard handling for modal
	useEffect(() => {
		if (!showCreateModal) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				handleCloseCreateModal()
			} else if (e.key === 'Enter' && newDocumentName.trim() && !actionLoading) {
				e.preventDefault()
				handleCreateDocument()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [showCreateModal, newDocumentName, actionLoading])

	// Select text when modal opens
	useEffect(() => {
		if (showCreateModal && documentNameInputRef.current) {
			// Use setTimeout to ensure the input is fully rendered and focused
			setTimeout(() => {
				documentNameInputRef.current?.select()
			}, 0)
		}
	}, [showCreateModal])

	const handleCreateDocument = async () => {
		if (!newDocumentName.trim()) {
			setValidationError('Document name is required')
			return
		}

		try {
			setActionLoading(true)
			setValidationError(null)

			const abortController = new AbortController()
			currentRequestRef.current = abortController

			const response = await fetch(`/api/workspaces/${workspace.id}/documents`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newDocumentName.trim() }),
				signal: abortController.signal,
			})

			const data = await response.json()

			if (data.success && data.data) {
				// Navigate to the new document
				router.push(`/d/${data.data.id}`)
				setShowCreateModal(false)
				setNewDocumentName('')
				setValidationError(null)
			} else {
				setValidationError(data.error?.message || 'Failed to create document')
			}
		} catch (err) {
			if (err instanceof Error && err.name !== 'AbortError') {
				console.error('Failed to create document:', err)
				setValidationError('Failed to create document. Please try again.')
			}
		} finally {
			setActionLoading(false)
			currentRequestRef.current = null
		}
	}

	const handleRenameDocument = async (documentId: string, newName: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName }),
			})

			const data = await response.json()

			if (!data.success) {
				alert(data.error?.message || 'Failed to rename document')
			}
			// Document will be updated via realtime subscription
		} catch (err) {
			console.error('Failed to rename document:', err)
			alert('Failed to rename document')
		}
	}

	const handleDuplicateDocument = async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}/duplicate`, {
				method: 'POST',
			})

			const data = await response.json()

			if (!data.success) {
				alert(data.error?.message || 'Failed to duplicate document')
			}
			// Document will be added via realtime subscription
		} catch (err) {
			console.error('Failed to duplicate document:', err)
			alert('Failed to duplicate document')
		}
	}

	const handleArchiveDocument = async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}/archive`, {
				method: 'POST',
			})

			const data = await response.json()

			if (!data.success) {
				alert(data.error?.message || 'Failed to archive document')
			}
			// Document will be removed from list via realtime subscription
		} catch (err) {
			console.error('Failed to archive document:', err)
			alert('Failed to archive document')
		}
	}

	const handleDeleteDocument = async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}/delete`, {
				method: 'DELETE',
			})

			const data = await response.json()

			if (!data.success) {
				alert(data.error?.message || 'Failed to delete document')
			}
			// Document will be removed via realtime subscription
		} catch (err) {
			console.error('Failed to delete document:', err)
			alert('Failed to delete document')
		}
	}

	const canEdit = isOwner || role === 'member'

	return (
		<div className="flex h-screen flex-col">
			{/* Header */}
			<header className="border-b px-6 py-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">{workspace.name}</h1>
						<p className="text-sm text-gray-600">{isOwner ? 'Owner' : `Member (${role})`}</p>
					</div>
					<div className="flex gap-2">
						<Link
							href={`/workspace/${workspace.id}/archive`}
							className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
						>
							Archive
						</Link>
						{isOwner && (
							<>
								<Link
									href={`/workspace/${workspace.id}/members`}
									className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
								>
									Members
								</Link>
								<Link
									href={`/workspace/${workspace.id}/settings`}
									className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
								>
									Settings
								</Link>
							</>
						)}
						<Link
							href="/dashboard"
							className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
						>
							Back to Dashboard
						</Link>
					</div>
				</div>
			</header>

			{/* Main content */}
			<div className="flex flex-1 overflow-hidden">
				{/* Folder tree sidebar */}
				<aside className="w-64 overflow-y-auto border-r p-4">
					<h2 className="mb-4 font-semibold">Folders</h2>
					{folders.length === 0 ? (
						<p className="text-sm text-gray-500">No folders yet</p>
					) : (
						<ul className="space-y-1">
							{folders.map((folder) => (
								<li key={folder.id}>
									<button className="w-full rounded px-2 py-1 text-left text-sm hover:bg-gray-100">
										📁 {folder.name}
									</button>
								</li>
							))}
						</ul>
					)}
				</aside>

				{/* Documents list */}
				<main className="flex-1 overflow-y-auto p-6">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-xl font-semibold">Documents</h2>
						{canEdit && (
							<button
								onClick={() => {
									setNewDocumentName('New Document')
									setValidationError(null)
									setShowCreateModal(true)
								}}
								data-testid="create-document-button"
								className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
							>
								+ New Document
							</button>
						)}
					</div>

					{documents.length === 0 ? (
						<EmptyDocumentList
							canCreate={canEdit}
							onCreateDocument={() => {
								setNewDocumentName('New Document')
								setValidationError(null)
								setShowCreateModal(true)
							}}
						/>
					) : (
						<div
							className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
							data-testid="document-list"
						>
							{documents.map((doc) => {
								// Handle both initial load (with creator object) and realtime updates (without)
								const docWithCreator = doc as Document & {
									creator?: {
										id: string
										display_name: string | null
										name: string | null
										email: string
									}
								}
								return (
									<DocumentCard
										key={doc.id}
										document={{
											...doc,
											created_by: docWithCreator.creator || undefined,
										}}
										onClick={() => router.push(`/d/${doc.id}`)}
										onRename={(newName) => handleRenameDocument(doc.id, newName)}
										onDuplicate={() => handleDuplicateDocument(doc.id)}
										onArchive={() => handleArchiveDocument(doc.id)}
										onDelete={() => handleDeleteDocument(doc.id)}
										canEdit={canEdit}
										canDelete={isOwner || doc.created_by === userId}
									/>
								)
							})}
						</div>
					)}
				</main>
			</div>

			{/* Create Document Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg p-6 max-w-md w-full border text-gray-900">
						<h3 className="text-xl font-semibold mb-4 text-gray-900">Create New Document</h3>
						<input
							ref={documentNameInputRef}
							type="text"
							value={newDocumentName}
							onChange={(e) => {
								setNewDocumentName(e.target.value)
								if (validationError) setValidationError(null)
							}}
							onBlur={() => {
								if (!newDocumentName.trim()) {
									setValidationError('Document name is required')
								}
							}}
							placeholder="Document name"
							data-testid="document-name-input"
							className={`w-full px-3 py-2 rounded-md border ${
								validationError ? 'border-red-500' : 'border-gray-300'
							} bg-white text-gray-900 placeholder:text-gray-500 mb-2`}
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
								className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
								disabled={actionLoading}
							>
								Cancel
							</button>
							<button
								onClick={handleCreateDocument}
								data-testid="confirm-create-document"
								className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
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
