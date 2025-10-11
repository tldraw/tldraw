'use client'

// FolderPicker Component
// Modal dialog for selecting a target folder for move operations

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import type { Folder } from '@/lib/api/types'
import { ChevronRight, Folder as FolderIcon, Home } from 'lucide-react'
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
				<button
					className={`
						w-full flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded text-left
						hover:bg-accent transition-colors
						${isSelected ? 'bg-accent text-accent-foreground' : ''}
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
							className="p-0.5 hover:bg-muted rounded"
						>
							<ChevronRight
								className={`h-3 w-3 text-muted-foreground transition-transform ${
									isExpanded ? 'rotate-90' : ''
								}`}
							/>
						</button>
					)}
					{!hasChildren && <div className="w-4" />}

					{/* Folder icon */}
					<FolderIcon
						className={`h-4 w-4 flex-shrink-0 ${
							isSelected ? 'text-primary' : 'text-muted-foreground'
						}`}
					/>

					{/* Folder name */}
					<span>{folder.name}</span>
				</button>

				{/* Render children if expanded */}
				{isExpanded && children.map((child) => renderFolderNode(child, level + 1))}
			</div>
		)
	}

	const rootFolders = hierarchy.get(null) || []

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Move to Folder</DialogTitle>
					<DialogDescription>Select a destination folder</DialogDescription>
				</DialogHeader>

				{/* Folder tree */}
				<div className="max-h-96 overflow-y-auto py-2 border rounded-md">
					{/* Root level option */}
					<button
						className={`
							w-full flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded text-left mx-2
							hover:bg-accent transition-colors
							${selectedFolderId === null ? 'bg-accent text-accent-foreground' : ''}
						`}
						onClick={() => setSelectedFolderId(null)}
					>
						<Home className="h-4 w-4 text-muted-foreground" />
						<span className="font-medium">Workspace Root</span>
					</button>

					{/* Folder hierarchy */}
					<div className="mt-1 px-2">{rootFolders.map((folder) => renderFolderNode(folder))}</div>

					{folders.length === 0 && (
						<div className="text-center py-8 text-muted-foreground">
							<p>No folders available</p>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button onClick={() => onSelect(selectedFolderId)}>Move Here</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
