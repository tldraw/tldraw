'use client'

// MoveDocumentDialog Component
// Modal dialog for moving documents between folders and workspaces

import type { Document, Folder, Workspace } from '@/lib/api/types'
import { useMemo, useState } from 'react'

interface MoveDocumentDialogProps {
	document: Document
	workspaces: Workspace[]
	folders: Folder[]
	currentUserId: string
	isOpen: boolean
	onMove: (targetWorkspaceId: string, targetFolderId: string | null) => void
	onCancel: () => void
}

export function MoveDocumentDialog({
	document,
	workspaces,
	folders,
	currentUserId,
	isOpen,
	onMove,
	onCancel,
}: MoveDocumentDialogProps) {
	const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(document.workspace_id)
	const [selectedFolderId, setSelectedFolderId] = useState<string | null>(document.folder_id)
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

	// Check if user is document creator (can move between workspaces)
	const isCreator = document.created_by === currentUserId

	// Filter workspaces that user can move document to
	const availableWorkspaces = useMemo(() => {
		if (isCreator) {
			// Creator can move to any workspace they're a member of
			return workspaces.filter((w) => !w.is_deleted)
		}
		// Non-creators can only move within current workspace
		return workspaces.filter((w) => w.id === document.workspace_id && !w.is_deleted)
	}, [workspaces, isCreator, document.workspace_id])

	// Filter folders for selected workspace
	const availableFolders = useMemo(() => {
		return folders.filter((f) => f.workspace_id === selectedWorkspaceId)
	}, [folders, selectedWorkspaceId])

	// Build folder hierarchy
	const folderHierarchy = useMemo(() => {
		const hierarchy: Map<string | null, Folder[]> = new Map()

		availableFolders.forEach((folder) => {
			const parentId = folder.parent_folder_id || null
			if (!hierarchy.has(parentId)) {
				hierarchy.set(parentId, [])
			}
			hierarchy.get(parentId)!.push(folder)
		})

		// Sort folders alphabetically within each level
		hierarchy.forEach((children) => {
			children.sort((a, b) => a.name.localeCompare(b.name))
		})

		return hierarchy
	}, [availableFolders])

	const toggleFolder = (folderId: string) => {
		setExpandedFolders((prev) => {
			const next = new Set(prev)
			if (next.has(folderId)) {
				next.delete(folderId)
			} else {
				next.add(folderId)
			}
			return next
		})
	}

	const handleWorkspaceChange = (workspaceId: string) => {
		setSelectedWorkspaceId(workspaceId)
		// Reset folder selection when changing workspaces
		if (workspaceId !== document.workspace_id) {
			setSelectedFolderId(null)
		}
	}

	const handleMove = () => {
		onMove(selectedWorkspaceId, selectedFolderId)
	}

	const isCurrentLocation =
		selectedWorkspaceId === document.workspace_id && selectedFolderId === document.folder_id

	const renderFolderNode = (folder: Folder, level: number = 0) => {
		const children = folderHierarchy.get(folder.id) || []
		const hasChildren = children.length > 0
		const isExpanded = expandedFolders.has(folder.id)
		const isSelected = selectedFolderId === folder.id

		return (
			<div key={folder.id}>
				<div
					className={`
						flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded
						hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
						${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}
					`}
					style={{ paddingLeft: `${12 + level * 20}px` }}
					onClick={() => setSelectedFolderId(folder.id)}
				>
					{/* Expand/collapse chevron */}
					{hasChildren && (
						<button
							onClick={(e) => {
								e.stopPropagation()
								toggleFolder(folder.id)
							}}
							className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
						>
							<svg
								className={`w-3 h-3 text-gray-500 transition-transform ${
									isExpanded ? 'rotate-90' : ''
								}`}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</button>
					)}
					{!hasChildren && <div className="w-4" />}

					{/* Folder icon */}
					<svg
						className={`w-4 h-4 flex-shrink-0 ${
							isSelected ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
						}`}
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4z"
							clipRule="evenodd"
						/>
					</svg>

					{/* Folder name */}
					<span className="text-sm">{folder.name}</span>
				</div>

				{/* Render children if expanded */}
				{isExpanded && children.map((child) => renderFolderNode(child, level + 1))}
			</div>
		)
	}

	const rootFolders = folderHierarchy.get(null) || []

	if (!isOpen) return null

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			data-testid="move-document-dialog"
		>
			<div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4">
				{/* Header */}
				<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Move Document</h2>
					<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
						{isCreator
							? 'Select a workspace and folder to move this document'
							: 'Select a folder within this workspace'}
					</p>
				</div>

				{/* Content */}
				<div className="px-6 py-4 space-y-4">
					{/* Workspace selector */}
					{availableWorkspaces.length > 1 && (
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Workspace
							</label>
							<select
								data-testid="workspace-selector"
								value={selectedWorkspaceId}
								onChange={(e) => handleWorkspaceChange(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								{availableWorkspaces.map((workspace) => (
									<option key={workspace.id} value={workspace.id}>
										{workspace.name}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Folder selector */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Folder
						</label>
						<div className="max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
							{/* Root level option */}
							<div
								data-testid="folder-root"
								className={`
									flex items-center gap-2 px-3 py-1.5 cursor-pointer
									hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
									${selectedFolderId === null ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}
								`}
								onClick={() => setSelectedFolderId(null)}
							>
								<svg
									className="w-4 h-4 text-gray-400 dark:text-gray-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
									/>
								</svg>
								<span className="text-sm font-medium">Workspace Root</span>
							</div>

							{/* Folder hierarchy */}
							{rootFolders.length > 0 && (
								<div className="mt-1">{rootFolders.map((folder) => renderFolderNode(folder))}</div>
							)}

							{availableFolders.length === 0 && (
								<div className="text-center py-8 text-gray-500 dark:text-gray-400">
									<p className="text-sm">No folders available</p>
								</div>
							)}
						</div>
					</div>

					{/* Warning message */}
					{!isCreator && availableWorkspaces.length === 1 && (
						<div className="flex gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
							<svg
								className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="text-sm text-yellow-800 dark:text-yellow-300">
								Only the document creator can move documents between workspaces.
							</p>
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
					<button
						data-testid="cancel-move-button"
						onClick={onCancel}
						className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
					>
						Cancel
					</button>
					<button
						data-testid="confirm-move-button"
						onClick={handleMove}
						disabled={isCurrentLocation}
						className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
							isCurrentLocation
								? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
								: 'bg-blue-600 hover:bg-blue-700 text-white'
						}`}
					>
						Move Here
					</button>
				</div>
			</div>
		</div>
	)
}
