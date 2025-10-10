'use client'

import { useLocalStorageState } from '@/app/hooks/useLocalStorageState'
import { Button } from '@/components/ui/button'
import { Document, Folder } from '@/lib/api/types'
import { Folder as FolderIcon, FolderOpenIcon } from 'lucide-react'
import Link from 'next/link'
import { SIDEBAR_ITEM_HOVERABLE } from './sidebar-styles'
import { SidebarDepthIndicator } from './SidebarDepthIndicator'
import { SidebarDocumentItem } from './SidebarDocumentItem'
import { SidebarNewDocumentButton } from './SidebarNewDocumentButton'

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
	onCreateDocument: (folder?: Folder) => void
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
	onCreateDocument,
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
		<>
			{/* Folder Header */}
			<div className={`${SIDEBAR_ITEM_HOVERABLE} `} data-testid={`sidebar-folder-${folder.id}`}>
				<SidebarDepthIndicator depth={depth} />
				<Button
					variant="include"
					size="icon"
					onClick={toggleExpanded}
					className="shrink-0 h-6 w-6 p-0 mr-1"
					aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
					aria-expanded={isExpanded}
				>
					{isExpanded ? (
						<FolderOpenIcon className="w-4 h-4 shrink-0 text-foreground/60" />
					) : (
						<FolderIcon className="w-4 h-4 shrink-0 text-foreground/60" />
					)}
				</Button>
				<Link
					href={`/workspace/${workspaceId}/folder/${folder.id}`}
					className="flex-1 flex items-center gap-1.5 min-w-0"
				>
					<span className="truncate" title={folder.name}>
						{folder.name}
					</span>
				</Link>
			</div>

			{/* Folder Contents (when expanded) */}
			{isExpanded && (
				<>
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
								onCreateDocument={onCreateDocument}
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
						<SidebarNewDocumentButton onSelect={() => onCreateDocument(folder)} id={folder.id} />
					)}
				</>
			)}
		</>
	)
}
