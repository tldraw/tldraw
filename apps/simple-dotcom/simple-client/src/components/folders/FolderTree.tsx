'use client'

// FolderTree Component
// Hierarchical folder browser with expand/collapse

import { useMemo, useState } from 'react'
import { FolderListItem } from './FolderListItem'

interface Folder {
	id: string
	name: string
	parent_folder_id?: string | null
	created_at?: string
	updated_at?: string
}

interface FolderTreeProps {
	folders: Folder[]
	onFolderClick?: (folder: Folder) => void
	onFolderRename?: (folderId: string, newName: string) => void
	onFolderMove?: (folderId: string, targetFolderId: string | null) => void
	onFolderDelete?: (folderId: string) => void
	canEdit?: boolean
	canDelete?: boolean
	selectedFolderId?: string | null
	className?: string
}

export function FolderTree({
	folders,
	onFolderClick,
	onFolderRename,
	onFolderMove,
	onFolderDelete,
	canEdit = false,
	canDelete = false,
	selectedFolderId,
	className = '',
}: FolderTreeProps) {
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

	// Build folder hierarchy
	const folderHierarchy = useMemo(() => {
		const hierarchy: Map<string | null, Folder[]> = new Map()

		// Group folders by parent
		folders.forEach((folder) => {
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
	}, [folders])

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
		const children = folderHierarchy.get(folder.id) || []
		const hasChildren = children.length > 0
		const isExpanded = expandedFolders.has(folder.id)

		return (
			<div key={folder.id}>
				<FolderListItem
					folder={folder}
					onClick={() => {
						if (hasChildren) {
							toggleFolder(folder.id)
						}
						onFolderClick?.(folder)
					}}
					onRename={onFolderRename ? (name) => onFolderRename(folder.id, name) : undefined}
					onMove={onFolderMove ? (targetId) => onFolderMove(folder.id, targetId) : undefined}
					onDelete={onFolderDelete ? () => onFolderDelete(folder.id) : undefined}
					canEdit={canEdit}
					canDelete={canDelete}
					hasChildren={hasChildren}
					level={level}
				/>

				{/* Render children if expanded */}
				{isExpanded && children.map((child) => renderFolderNode(child, level + 1))}
			</div>
		)
	}

	// Get root folders (no parent)
	const rootFolders = folderHierarchy.get(null) || []

	if (rootFolders.length === 0 && folders.length === 0) {
		return null
	}

	return (
		<div className={`${className}`}>{rootFolders.map((folder) => renderFolderNode(folder))}</div>
	)
}
