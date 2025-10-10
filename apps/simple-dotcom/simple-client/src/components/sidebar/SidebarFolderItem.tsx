'use client'

import { useLocalStorageState } from '@/app/hooks/useLocalStorageState'
import { Document, Folder } from '@/lib/api/types'
import { ChevronDown, ChevronRight, Folder as FolderIcon } from 'lucide-react'
import Link from 'next/link'
import { SidebarDocumentItem } from './SidebarDocumentItem'

interface SidebarFolderItemProps {
	folder: Folder
	workspaceId: string
	documents: Document[]
	childFolders: Folder[]
	allFolders: Folder[]
	allDocuments: Document[]
	depth?: number
	canEdit: boolean
	canDelete: boolean
	onInvalidate?: () => void
}

/**
 * SidebarFolderItem
 *
 * Recursive collapsible folder component for sidebar navigation.
 *
 * Features:
 * - localStorage persistence for expand/collapse state
 * - Recursive rendering of nested folders (up to 10 levels deep)
 * - Depth-based indentation (16px per level)
 * - Click folder name to navigate to folder view
 * - Click chevron to expand/collapse
 */
export function SidebarFolderItem({
	folder,
	workspaceId,
	documents,
	childFolders,
	allFolders,
	allDocuments,
	depth = 0,
	canEdit,
	canDelete,
	onInvalidate,
}: SidebarFolderItemProps) {
	const [isExpanded, setIsExpanded] = useLocalStorageState(
		`sidebar-folder-${folder.id}-expanded`,
		true
	)

	const toggleExpanded = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setIsExpanded(!isExpanded)
	}

	// Filter documents that belong directly to this folder
	const folderDocuments = documents.filter((doc) => doc.folder_id === folder.id)

	return (
		<div>
			{/* Folder Header */}
			<div
				className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-foreground/5 cursor-pointer"
				data-testid={`sidebar-folder-${folder.id}`}
				style={{ paddingLeft: `${8 + depth * 16}px` }}
			>
				<button
					onClick={toggleExpanded}
					className="shrink-0 p-0.5 hover:bg-foreground/10 rounded"
					aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
					aria-expanded={isExpanded}
				>
					{isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
				</button>
				<Link
					href={`/workspace/${workspaceId}/folder/${folder.id}`}
					className="flex-1 flex items-center gap-1.5 min-w-0"
				>
					<FolderIcon className="w-4 h-4 shrink-0 text-foreground/60" />
					<span className="truncate" title={folder.name}>
						{folder.name}
					</span>
				</Link>
			</div>

			{/* Folder Contents (when expanded) */}
			{isExpanded && (
				<div>
					{/* Child Folders (recursive) */}
					{childFolders.map((childFolder) => {
						// Find nested folders and documents for this child
						const nestedFolders = allFolders.filter((f) => f.parent_folder_id === childFolder.id)
						const nestedDocuments = allDocuments.filter((d) => d.folder_id === childFolder.id)

						return (
							<SidebarFolderItem
								key={childFolder.id}
								folder={childFolder}
								workspaceId={workspaceId}
								documents={nestedDocuments}
								childFolders={nestedFolders}
								allFolders={allFolders}
								allDocuments={allDocuments}
								depth={depth + 1}
								canEdit={canEdit}
								canDelete={canDelete}
								onInvalidate={onInvalidate}
							/>
						)
					})}

					{/* Documents in this folder */}
					{folderDocuments.map((doc) => (
						<SidebarDocumentItem
							key={doc.id}
							document={doc}
							workspaceId={workspaceId}
							depth={depth + 1}
							canEdit={canEdit}
							canDelete={canDelete}
							onInvalidate={onInvalidate}
						/>
					))}

					{/* Empty state */}
					{childFolders.length === 0 && folderDocuments.length === 0 && (
						<div
							className="text-xs text-foreground/40 italic py-1 px-2"
							style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}
						>
							Empty folder
						</div>
					)}
				</div>
			)}
		</div>
	)
}
