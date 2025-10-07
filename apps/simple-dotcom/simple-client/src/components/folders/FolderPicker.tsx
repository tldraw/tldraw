'use client'

// FolderPicker Component
// Modal dialog for selecting a target folder for move operations

import type { Folder } from '@/lib/api/types'
import { useMemo, useState } from 'react'

interface FolderPickerProps {
	folders: Folder[]
	currentFolderId: string
	currentParentId?: string | null
	onSelect: (folderId: string | null) => void
	onCancel: () => void
	isOpen: boolean
}

export function FolderPicker({
	folders,
	currentFolderId,
	currentParentId,
	onSelect,
	onCancel,
	isOpen,
}: FolderPickerProps) {
	const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentParentId || null)
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

	// Build folder hierarchy and exclude current folder and its descendants
	const { hierarchy, validTargets } = useMemo(() => {
		const hierarchy: Map<string | null, Folder[]> = new Map()
		const descendants = new Set<string>()

		// Find all descendants of current folder
		const findDescendants = (folderId: string) => {
			descendants.add(folderId)
			const children = folders.filter((f) => f.parent_folder_id === folderId)
			children.forEach((child) => findDescendants(child.id))
		}
		findDescendants(currentFolderId)

		// Build hierarchy excluding current folder and descendants
		const validFolders = folders.filter((f) => !descendants.has(f.id))
		const validTargets = new Set(validFolders.map((f) => f.id))
		validTargets.add('root') // Add root as valid target

		validFolders.forEach((folder) => {
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

		return { hierarchy, validTargets }
	}, [folders, currentFolderId])

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

	const renderFolderNode = (folder: Folder, level: number = 0) => {
		const children = hierarchy.get(folder.id) || []
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

	const rootFolders = hierarchy.get(null) || []

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4">
				{/* Header */}
				<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Move to Folder</h2>
					<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
						Select a destination folder
					</p>
				</div>

				{/* Folder tree */}
				<div className="max-h-96 overflow-y-auto py-2">
					{/* Root level option */}
					<div
						className={`
							flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded mx-2
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
					<div className="mt-1 px-2">{rootFolders.map((folder) => renderFolderNode(folder))}</div>

					{folders.length === 0 && (
						<div className="text-center py-8 text-gray-500 dark:text-gray-400">
							<p className="text-sm">No folders available</p>
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
					<button
						onClick={onCancel}
						className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={() => onSelect(selectedFolderId)}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
					>
						Move Here
					</button>
				</div>
			</div>
		</div>
	)
}
