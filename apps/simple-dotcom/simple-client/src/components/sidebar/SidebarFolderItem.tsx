'use client'

import { useLocalStorageState } from '@/app/hooks/useLocalStorageState'
import { FolderActions } from '@/components/folders/FolderActions'
import { Button } from '@/components/ui/button'
import { Document, Folder } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { ChevronDownFilledIcon, ChevronRightFilledIcon } from '../shared/ChevronIcon'
import { NewFileIcon } from '../shared/NewFileIcon'
import { NewFolderIcon } from '../shared/NewFolderIcon'
import { SIDEBAR_ITEM_HOVERABLE, SIDEBAR_MENU_BUTTON } from './sidebar-styles'
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
	onCreateFolder: (folder?: Folder) => void
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
 * - Click folder row to expand/collapse
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
	onCreateFolder,
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
		<div className="group/section">
			{/* Folder Header */}
			<div
				data-testid={`sidebar-folder-${folder.id}`}
				className={cn(SIDEBAR_ITEM_HOVERABLE, 'group/item pl-2 justify-between')}
			>
				<SidebarDepthIndicator depth={depth} />
				<Button
					variant="include"
					onClick={toggleExpanded}
					className="shrink-0 h-full grow-1 justify-start pl-0 pr-0 gap-1 group/item"
					aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
					aria-expanded={isExpanded}
				>
					{folder.name}
					{isExpanded ? (
						<ChevronDownFilledIcon className="text-foreground/30 group-hover/item:text-foreground/60" />
					) : (
						<ChevronRightFilledIcon className="text-foreground/30 group-hover/item:text-foregroundd/60" />
					)}
				</Button>
				<Button
					variant="include"
					size="icon"
					title="Create document"
					className={cn(SIDEBAR_MENU_BUTTON, 'w-7 group-hover/section:opacity-30')}
					aria-label="Create document"
					data-testid={`create-document-${workspaceId}-${folder.id}`}
					onClick={() => onCreateDocument(folder)}
				>
					<NewFileIcon className="size-4" />
				</Button>
				<Button
					variant="include"
					size="icon"
					title="Create folder"
					className={cn(SIDEBAR_MENU_BUTTON, 'w-7 group-hover/section:opacity-30')}
					aria-label="Create folder"
					data-testid={`create-folder-${workspaceId}-${folder.id}`}
					onClick={() => onCreateFolder(folder)}
				>
					<NewFolderIcon className="size-4" />
				</Button>
				<div onClick={(e) => e.stopPropagation()}>
					<FolderActions
						folder={folder}
						allFolders={allFolders}
						onRename={async (newName) => {
							// TODO: Implement folder rename
							console.log('Rename folder:', folder.id, newName)
						}}
						onMove={async (targetFolderId) => {
							// TODO: Implement folder move
							console.log('Move folder:', folder.id, 'to', targetFolderId)
						}}
						onDelete={async () => {
							// TODO: Implement folder delete
							console.log('Delete folder:', folder.id)
						}}
						canEdit={canEdit}
						canDelete={canDelete}
					/>
				</div>
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
								onCreateFolder={onCreateFolder}
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
					{folderDocuments.length < 3 && (
						<SidebarNewDocumentButton
							depth={depth + 1}
							onSelect={() => onCreateDocument(folder)}
							id={folder.id}
						/>
					)}
				</>
			)}
		</div>
	)
}
