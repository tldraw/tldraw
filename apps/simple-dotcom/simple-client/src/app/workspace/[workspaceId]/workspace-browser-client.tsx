'use client'

import { DocumentCard } from '@/components/documents/DocumentCard'
import { EmptyDocumentList } from '@/components/documents/EmptyDocumentList'
import { FolderBreadcrumbs } from '@/components/folders/FolderBreadcrumbs'
import { FolderTree } from '@/components/folders/FolderTree'
import { useWorkspaceRealtimeUpdates } from '@/hooks/useWorkspaceRealtimeUpdates'
import { Document, Folder, Workspace } from '@/lib/api/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
	folders: initialFolders,
	role,
	isOwner,
	userId,
}: WorkspaceBrowserClientProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
	const [showCreateDocumentModal, setShowCreateDocumentModal] = useState(false)
	const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
	const [newDocumentName, setNewDocumentName] = useState('')
	const [newFolderName, setNewFolderName] = useState('')
	const [actionLoading, setActionLoading] = useState(false)
	const [validationError, setValidationError] = useState<string | null>(null)
	const currentRequestRef = useRef<AbortController | null>(null)
	const documentNameInputRef = useRef<HTMLInputElement>(null)
	const folderNameInputRef = useRef<HTMLInputElement>(null)

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
		refetchOnMount: true, // Refetch when returning to workspace browser
		refetchOnReconnect: true, // Refetch when connection restored
	})

	// Fetch folders data with React Query
	// Hybrid approach: Realtime for instant updates + polling for reliability
	const { data: folders = initialFolders } = useQuery<Folder[]>({
		queryKey: ['workspace-folders', workspace.id],
		queryFn: async () => {
			const response = await fetch(`/api/workspaces/${workspace.id}/folders`)
			const result = await response.json()
			if (!result.success) {
				throw new Error(result.error?.message || 'Failed to fetch folders')
			}
			return result.data
		},
		initialData: initialFolders,
		staleTime: 1000 * 10, // 10 seconds - shorter to catch missed realtime events
		refetchInterval: 1000 * 15, // Poll every 15 seconds as fallback
		refetchOnMount: true, // Refetch when returning to workspace browser
		refetchOnReconnect: true, // Refetch when connection restored
	})

	// Enable realtime subscriptions using broadcast pattern
	// This follows the documented hybrid realtime strategy (broadcast + polling)
	useWorkspaceRealtimeUpdates(workspace.id, {
		onChange: () => {
			// Invalidate queries to trigger refetch when any workspace event is received
			queryClient.invalidateQueries({ queryKey: ['workspace-documents', workspace.id] })
			queryClient.invalidateQueries({ queryKey: ['workspace-folders', workspace.id] })
		},
		enabled: true,
	})

	// Filter documents by selected folder
	const filteredDocuments = selectedFolderId
		? documents.filter((doc) => doc.folder_id === selectedFolderId)
		: documents.filter((doc) => !doc.folder_id) // Show only root-level documents when no folder selected

	const handleCloseCreateDocumentModal = () => {
		if (currentRequestRef.current) {
			currentRequestRef.current.abort()
		}
		setShowCreateDocumentModal(false)
		setNewDocumentName('')
		setValidationError(null)
		setActionLoading(false)
	}

	const handleCloseCreateFolderModal = () => {
		setShowCreateFolderModal(false)
		setNewFolderName('')
		setValidationError(null)
		setActionLoading(false)
	}

	// Keyboard handling for document modal
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

	// Keyboard handling for folder modal
	useEffect(() => {
		if (!showCreateFolderModal) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				handleCloseCreateFolderModal()
			} else if (e.key === 'Enter' && newFolderName.trim() && !actionLoading) {
				e.preventDefault()
				handleCreateFolder()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [showCreateFolderModal, newFolderName, actionLoading])

	// Select text when document modal opens
	useEffect(() => {
		if (showCreateDocumentModal && documentNameInputRef.current) {
			setTimeout(() => {
				documentNameInputRef.current?.select()
			}, 0)
		}
	}, [showCreateDocumentModal])

	// Select text when folder modal opens
	useEffect(() => {
		if (showCreateFolderModal && folderNameInputRef.current) {
			setTimeout(() => {
				folderNameInputRef.current?.select()
			}, 0)
		}
	}, [showCreateFolderModal])

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
				body: JSON.stringify({
					name: newDocumentName.trim(),
					folder_id: selectedFolderId,
				}),
				signal: abortController.signal,
			})

			const data = await response.json()

			if (data.success && data.data) {
				// Navigate to the new document
				router.push(`/d/${data.data.id}`)
				setShowCreateDocumentModal(false)
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

	const handleCreateFolder = async () => {
		if (!newFolderName.trim()) {
			setValidationError('Folder name is required')
			return
		}

		try {
			setActionLoading(true)
			setValidationError(null)

			const response = await fetch(`/api/workspaces/${workspace.id}/folders`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newFolderName.trim(),
					parent_folder_id: selectedFolderId,
				}),
			})

			const data = await response.json()

			if (data.success && data.data) {
				setShowCreateFolderModal(false)
				setNewFolderName('')
				setValidationError(null)
				// Invalidate queries to trigger refetch
				queryClient.invalidateQueries({ queryKey: ['workspace-folders', workspace.id] })
			} else {
				setValidationError(data.error?.message || 'Failed to create folder')
			}
		} catch (err) {
			console.error('Failed to create folder:', err)
			setValidationError('Failed to create folder. Please try again.')
		} finally {
			setActionLoading(false)
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
			} else {
				// Invalidate queries to trigger refetch
				// The realtime subscription will also trigger this, but we do it immediately for better UX
				queryClient.invalidateQueries({ queryKey: ['workspace-documents', workspace.id] })
			}
		} catch (err) {
			console.error('Failed to archive document:', err)
			alert('Failed to archive document')
		}
	}

	const handleDeleteDocument = async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}/delete`, {
				method: 'DELETE',
				headers: {
					'X-Confirm-Delete': 'true',
				},
			})

			const data = await response.json()

			if (!data.success) {
				alert(data.error?.message || 'Failed to delete document')
			} else {
				// Invalidate queries to trigger refetch
				// The realtime subscription will also trigger this, but we do it immediately for better UX
				queryClient.invalidateQueries({ queryKey: ['workspace-documents', workspace.id] })
			}
		} catch (err) {
			console.error('Failed to delete document:', err)
			alert('Failed to delete document')
		}
	}

	const handleRenameFolder = async (folderId: string, newName: string) => {
		try {
			const response = await fetch(`/api/folders/${folderId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName }),
			})

			const data = await response.json()

			if (!data.success) {
				alert(data.error?.message || 'Failed to rename folder')
			}
			// Folder will be updated via realtime subscription
		} catch (err) {
			console.error('Failed to rename folder:', err)
			alert('Failed to rename folder')
		}
	}

	const handleMoveFolder = async (folderId: string, targetFolderId: string | null) => {
		try {
			const response = await fetch(`/api/folders/${folderId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ parent_folder_id: targetFolderId }),
			})

			const data = await response.json()

			if (!data.success) {
				alert(data.error?.message || 'Failed to move folder')
			}
			// Folder will be updated via realtime subscription
		} catch (err) {
			console.error('Failed to move folder:', err)
			alert('Failed to move folder')
		}
	}

	const handleDeleteFolder = async (folderId: string) => {
		try {
			const response = await fetch(`/api/folders/${folderId}`, {
				method: 'DELETE',
			})

			const data = await response.json()

			if (!data.success) {
				alert(data.error?.message || 'Failed to delete folder')
			}
			// Folder will be removed via realtime subscription
			// Also reset selected folder if it was deleted
			if (selectedFolderId === folderId) {
				setSelectedFolderId(null)
			}
		} catch (err) {
			console.error('Failed to delete folder:', err)
			alert('Failed to delete folder')
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
						<p className="text-sm text-gray-600 dark:text-gray-400">
							{isOwner ? 'Owner' : `Member (${role})`}
						</p>
					</div>
					<div className="flex gap-2">
						{isOwner && (
							<>
								<Link
									href={`/workspace/${workspace.id}/members`}
									className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
								>
									Members
								</Link>
								<Link
									href={`/workspace/${workspace.id}/settings`}
									className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
								>
									Settings
								</Link>
							</>
						)}
						<Link
							href="/dashboard"
							className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
						>
							Back to Dashboard
						</Link>
					</div>
				</div>
			</header>

			{/* Main content */}
			<div className="flex flex-1 overflow-hidden">
				{/* Folder tree sidebar */}
				<aside className="w-64 overflow-y-auto border-r p-4 flex flex-col gap-4">
					{/* Root level button */}
					<button
						onClick={() => setSelectedFolderId(null)}
						className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
							selectedFolderId === null
								? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
								: 'hover:bg-gray-100 dark:hover:bg-gray-800'
						}`}
						data-testid="root-folder-button"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
							/>
						</svg>
						All Documents
					</button>

					{/* Archive link */}
					<Link
						href={`/workspace/${workspace.id}/archive`}
						className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						data-testid="archive-link"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
							/>
						</svg>
						Archive
					</Link>

					<div className="border-t pt-4">
						<div className="flex items-center justify-between mb-2">
							<h2 className="text-sm font-semibold">Folders</h2>
							{canEdit && (
								<button
									onClick={() => {
										setNewFolderName('New Folder')
										setValidationError(null)
										setShowCreateFolderModal(true)
									}}
									className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
									data-testid="create-folder-button"
									title="Create folder"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 4v16m8-8H4"
										/>
									</svg>
								</button>
							)}
						</div>
						<FolderTree
							folders={folders}
							onFolderClick={(folder) => setSelectedFolderId(folder.id)}
							onFolderRename={handleRenameFolder}
							onFolderMove={handleMoveFolder}
							onFolderDelete={handleDeleteFolder}
							canEdit={canEdit}
							canDelete={canEdit}
							selectedFolderId={selectedFolderId}
						/>
					</div>
				</aside>

				{/* Documents list */}
				<main className="flex-1 overflow-y-auto p-6 flex flex-col">
					{/* Breadcrumbs */}
					<FolderBreadcrumbs
						folders={folders}
						currentFolderId={selectedFolderId}
						onFolderClick={(folderId) => setSelectedFolderId(folderId)}
						showRoot={true}
						rootLabel={workspace.name}
						className="mb-4"
					/>

					{/* Toolbar */}
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-xl font-semibold">
							{selectedFolderId
								? folders.find((f) => f.id === selectedFolderId)?.name
								: 'All Documents'}
						</h2>
						{canEdit && (
							<button
								onClick={() => {
									setNewDocumentName('New Document')
									setValidationError(null)
									setShowCreateDocumentModal(true)
								}}
								data-testid="create-document-button"
								className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
							>
								+ New Document
							</button>
						)}
					</div>

					{filteredDocuments.length === 0 ? (
						<EmptyDocumentList
							canCreate={canEdit}
							onCreateDocument={() => {
								setNewDocumentName('New Document')
								setValidationError(null)
								setShowCreateDocumentModal(true)
							}}
						/>
					) : (
						<div
							className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
							data-testid="document-list"
						>
							{filteredDocuments.map((doc) => {
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
			{showCreateDocumentModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
					<div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full border text-gray-900 dark:text-gray-100">
						<h3 className="text-xl font-semibold mb-4">Create New Document</h3>
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
								validationError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
							} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 mb-2`}
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
								className="rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
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

			{/* Create Folder Modal */}
			{showCreateFolderModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
					<div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full border text-gray-900 dark:text-gray-100">
						<h3 className="text-xl font-semibold mb-4">Create New Folder</h3>
						<input
							ref={folderNameInputRef}
							type="text"
							value={newFolderName}
							onChange={(e) => {
								setNewFolderName(e.target.value)
								if (validationError) setValidationError(null)
							}}
							placeholder="Folder name"
							data-testid="folder-name-input"
							className={`w-full px-3 py-2 rounded-md border ${
								validationError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
							} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 mb-2`}
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
								onClick={handleCloseCreateFolderModal}
								className="rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
								disabled={actionLoading}
							>
								Cancel
							</button>
							<button
								onClick={handleCreateFolder}
								data-testid="confirm-create-folder"
								className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
								disabled={actionLoading || !newFolderName.trim()}
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
