'use client'

// MoveDocumentDialog Component
// Dialog for moving a document to a different folder or workspace root

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Folder } from '@/lib/api/types'
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, FolderIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

interface FolderTreeNode extends Folder {
	children: FolderTreeNode[]
}

interface MoveDocumentDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	document: {
		id: string
		name: string
		folder_id: string | null
	}
	workspaceId: string
	onMove: (folderId: string | null) => Promise<void>
}

export function MoveDocumentDialog({
	open,
	onOpenChange,
	document,
	workspaceId,
	onMove,
}: MoveDocumentDialogProps) {
	const [folders, setFolders] = useState<Folder[]>([])
	const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([])
	const [selectedFolderId, setSelectedFolderId] = useState<string | null>(document.folder_id)
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [moving, setMoving] = useState(false)

	// Fetch folders when dialog opens
	useEffect(() => {
		if (open && workspaceId) {
			fetchFolders()
		}
	}, [open, workspaceId])

	// Build folder tree when folders change
	useEffect(() => {
		if (folders.length > 0) {
			const tree = buildFolderTree(folders)
			setFolderTree(tree)
			// Auto-expand folders in current path
			if (document.folder_id) {
				const pathIds = getFolderPath(document.folder_id, folders)
				setExpandedFolders(new Set(pathIds))
			}
		}
	}, [folders, document.folder_id])

	const fetchFolders = async () => {
		setLoading(true)
		setError(null)
		try {
			const response = await fetch(`/api/workspaces/${workspaceId}/folders`)
			if (!response.ok) throw new Error('Failed to fetch folders')
			const data = await response.json()
			setFolders(data.data || [])
		} catch (err) {
			setError('Failed to load folders')
			console.error('Error fetching folders:', err)
		} finally {
			setLoading(false)
		}
	}

	const buildFolderTree = (folderList: Folder[]): FolderTreeNode[] => {
		const nodeMap = new Map<string, FolderTreeNode>()
		const rootNodes: FolderTreeNode[] = []

		// Create nodes
		folderList.forEach((folder) => {
			nodeMap.set(folder.id, { ...folder, children: [] })
		})

		// Build tree
		folderList.forEach((folder) => {
			const node = nodeMap.get(folder.id)!
			if (folder.parent_folder_id) {
				const parent = nodeMap.get(folder.parent_folder_id)
				if (parent) {
					parent.children.push(node)
				} else {
					rootNodes.push(node) // Parent not found, treat as root
				}
			} else {
				rootNodes.push(node)
			}
		})

		return rootNodes
	}

	const getFolderPath = (folderId: string, folderList: Folder[]): string[] => {
		const path: string[] = []
		let currentId: string | null = folderId

		while (currentId) {
			const folder = folderList.find((f) => f.id === currentId)
			if (!folder) break
			path.push(currentId)
			currentId = folder.parent_folder_id
		}

		return path
	}

	const toggleFolder = (folderId: string) => {
		const newExpanded = new Set(expandedFolders)
		if (newExpanded.has(folderId)) {
			newExpanded.delete(folderId)
		} else {
			newExpanded.add(folderId)
		}
		setExpandedFolders(newExpanded)
	}

	const handleMove = async () => {
		if (selectedFolderId === document.folder_id) {
			onOpenChange(false)
			return
		}

		setMoving(true)
		setError(null)
		try {
			await onMove(selectedFolderId)
			onOpenChange(false)
		} catch (err) {
			setError('Failed to move document')
			console.error('Error moving document:', err)
		} finally {
			setMoving(false)
		}
	}

	const renderFolderNode = (node: FolderTreeNode, depth: number = 0) => {
		const isExpanded = expandedFolders.has(node.id)
		const isSelected = selectedFolderId === node.id
		const isCurrent = document.folder_id === node.id
		const hasChildren = node.children.length > 0

		return (
			<div key={node.id}>
				<button
					className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent rounded-md transition-colors ${
						isSelected ? 'bg-accent' : ''
					} ${isCurrent ? 'opacity-60 cursor-not-allowed' : ''}`}
					style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
					onClick={() => !isCurrent && setSelectedFolderId(node.id)}
					disabled={isCurrent}
					data-testid={`folder-option-${node.id}`}
				>
					{hasChildren && (
						<button
							className="p-0 hover:bg-transparent"
							onClick={(e) => {
								e.stopPropagation()
								toggleFolder(node.id)
							}}
						>
							{isExpanded ? (
								<ChevronDownIcon className="h-4 w-4" />
							) : (
								<ChevronRightIcon className="h-4 w-4" />
							)}
						</button>
					)}
					{!hasChildren && <div className="w-4" />}
					<FolderIcon className="h-4 w-4 text-muted-foreground" />
					<span className="flex-1 truncate">{node.name}</span>
					{isCurrent && <CheckIcon className="h-4 w-4 text-muted-foreground" />}
					{isSelected && !isCurrent && <CheckIcon className="h-4 w-4 text-primary" />}
				</button>
				{hasChildren && isExpanded && (
					<div>{node.children.map((child) => renderFolderNode(child, depth + 1))}</div>
				)}
			</div>
		)
	}

	const isCurrentRoot = document.folder_id === null
	const canMove = selectedFolderId !== document.folder_id && !moving

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]" data-testid="move-document-dialog">
				<DialogHeader>
					<DialogTitle>Move Document</DialogTitle>
					<DialogDescription>
						Move &quot;{document.name}&quot; to a different folder or workspace root
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2">
					{loading && (
						<div className="py-8 text-center text-muted-foreground">Loading folders...</div>
					)}

					{error && (
						<div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
					)}

					{!loading && !error && (
						<div className="border rounded-md max-h-[400px] overflow-y-auto">
							{/* Workspace Root Option */}
							<button
								className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent border-b transition-colors ${
									selectedFolderId === null ? 'bg-accent' : ''
								} ${isCurrentRoot ? 'opacity-60 cursor-not-allowed' : ''}`}
								onClick={() => !isCurrentRoot && setSelectedFolderId(null)}
								disabled={isCurrentRoot}
								data-testid="workspace-root-option"
							>
								<FolderIcon className="h-4 w-4 text-muted-foreground" />
								<span className="flex-1 font-medium">Workspace Root</span>
								{isCurrentRoot && <CheckIcon className="h-4 w-4 text-muted-foreground" />}
								{selectedFolderId === null && !isCurrentRoot && (
									<CheckIcon className="h-4 w-4 text-primary" />
								)}
							</button>

							{/* Folder Tree */}
							<div className="py-1">
								{folderTree.length === 0 && (
									<div className="py-8 text-center text-sm text-muted-foreground">
										No folders in this workspace
									</div>
								)}
								{folderTree.map((node) => renderFolderNode(node, 0))}
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={moving}>
						Cancel
					</Button>
					<Button onClick={handleMove} disabled={!canMove} data-testid="move-document-confirm">
						{moving ? 'Moving...' : 'Move Here'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
