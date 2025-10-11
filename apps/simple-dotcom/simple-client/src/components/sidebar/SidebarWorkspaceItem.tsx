'use client'

import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Document, Folder, Workspace, WorkspaceRole } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { MoreVertical } from 'lucide-react'
import { useCallback, useState } from 'react'
import { ChevronDownFilledIcon, ChevronRightFilledIcon } from '../shared/ChevronIcon'
import { NewFileIcon } from '../shared/NewFileIcon'
import { NewFolderIcon } from '../shared/NewFolderIcon'
import { SidebarDocumentItem } from './SidebarDocumentItem'
import { SidebarFolderItem } from './SidebarFolderItem'
import { SidebarNewDocumentButton } from './SidebarNewDocumentButton'
import { SIDEBAR_ITEM_HOVERABLE, SIDEBAR_MENU_BUTTON } from './sidebar-styles'

interface SidebarWorkspaceItemProps {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
	userRole?: WorkspaceRole // Optional to handle fast refresh / initial load
	userId: string
	onCollapsedToggle?: (workspaceId: string) => void
	onCollapsedShiftToggle?: (workspaceId: string) => void
	isCollapsed: boolean
	onInvalidate?: () => void
	onOpenRenameModal: (workspace: Workspace) => void
	onOpenDeleteModal: (workspace: Workspace) => void
	onOpenCreateDocumentModal: (workspace: Workspace, folder?: Folder) => void
	onOpenCreateFolderModal: (workspace: Workspace, folder?: Folder) => void
}

/**
 * SidebarWorkspaceItem
 *
 * Collapsible workspace section for sidebar navigation.
 *
 * Features:
 * - localStorage persistence for expand/collapse state
 * - Shift+click to expand this workspace and collapse siblings
 * - Nested folder tree with SidebarFolderItem (recursive)
 * - Root-level documents
 * - Workspace actions (rename, delete - owner only)
 * - Create document button
 */
export function SidebarWorkspaceItem({
	workspace,
	documents,
	folders,
	userRole,
	userId,
	onCollapsedToggle,
	onCollapsedShiftToggle,
	isCollapsed,
	onInvalidate,
	onOpenRenameModal,
	onOpenCreateDocumentModal,
	onOpenCreateFolderModal,
}: SidebarWorkspaceItemProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false)

	const handleToggle = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault()
			e.stopPropagation()

			if (e.shiftKey) {
				// Shift+click: expand this, collapse siblings
				onCollapsedShiftToggle?.(workspace.id)
			} else {
				// Normal click: toggle this workspace
				onCollapsedToggle?.(workspace.id)
			}
		},
		[onCollapsedToggle, onCollapsedShiftToggle, workspace.id]
	)

	const isOwner = workspace.owner_id === userId
	// Fallback to 'member' if userRole is undefined (can happen during fast refresh)
	// Owners will still be identified via isOwner check
	const effectiveRole = userRole || (isOwner ? 'owner' : 'member')
	const canEdit = effectiveRole === 'owner' || effectiveRole === 'member'
	const canDelete = effectiveRole === 'owner'

	// Separate root-level folders and documents
	const rootFolders = folders.filter((f) => !f.parent_folder_id)
	const rootDocuments = documents.filter((d) => !d.folder_id && !d.is_archived)

	return (
		<div className="overflow-hidden group mb-2" data-testid={`sidebar-workspace-${workspace.id}`}>
			{/* Workspace Header */}
			<div className={`${SIDEBAR_ITEM_HOVERABLE} justify-between`}>
				<Button
					variant="include"
					onClick={handleToggle}
					className="shrink-0 h-full grow-1 justify-start pr-0 pl-3 gap-1 group/item"
					aria-label={isCollapsed ? 'Expand workspace' : 'Collapse workspace'}
					aria-expanded={!isCollapsed}
					data-testid={`toggle-workspace-${workspace.name
						.toLowerCase()
						.replace(/\s+/g, '-')
						.replace(/[^a-z0-9-]/g, '')}`}
				>
					<strong>{workspace.name}</strong>
					{isCollapsed ? (
						<ChevronDownFilledIcon className="text-foreground/30 group-hover/item:text-foreground/60" />
					) : (
						<ChevronRightFilledIcon className="text-foreground/30 group-hover/item:text-foreground/60" />
					)}
				</Button>
				<Button
					variant="include"
					size="icon"
					title="Create document"
					className={cn(SIDEBAR_MENU_BUTTON, 'w-7 group-hover:opacity-30')}
					aria-label="Create document"
					data-testid={`create-document-${workspace.id}`}
					onClick={() => onOpenCreateDocumentModal?.(workspace, undefined)}
				>
					<NewFileIcon className="size-4" />
				</Button>
				<Button
					variant="include"
					size="icon"
					title="Create folder"
					className={cn(SIDEBAR_MENU_BUTTON, 'w-7 group-hover:opacity-30')}
					aria-label="Create folder"
					data-testid={`create-folder-${workspace.id}`}
					onClick={() => onOpenCreateFolderModal?.(workspace, undefined)}
				>
					<NewFolderIcon className="size-4" />
				</Button>
				{/* Workspace Actions */}
				<DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
					<DropdownMenuTrigger asChild>
						<Button
							variant="include"
							size="icon"
							title="Workspace menu"
							className={cn(SIDEBAR_MENU_BUTTON, 'w-10 -ml-2 group-hover:opacity-30')}
							aria-label="Workspace menu"
							data-testid={`workspace-menu-${workspace.id}`}
							onClick={(e) => e.stopPropagation()}
						>
							<MoreVertical className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent sideOffset={0} align="end" className="w-48">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation()
								navigator.clipboard.writeText(window.location.origin + `/workspace/${workspace.id}`)
							}}
							data-testid={`copy-workspace-link-${workspace.id}`}
						>
							<span>Copy link</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation()
								onOpenCreateDocumentModal?.(workspace, undefined)
							}}
							data-testid={`create-document-${workspace.id}`}
						>
							<span>New document</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation()
								// TODO: Implement create folder
							}}
							data-testid={`create-folder-${workspace.id}`}
						>
							<>
								<span>New folder</span>
							</>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation()
								onOpenRenameModal?.(workspace)
							}}
							data-testid={`rename-workspace-${workspace.id}`}
						>
							<span>Settings</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Workspace Content */}
			<div
				data-testid={`workspace-content-${workspace.id}`}
				className="overflow-hidden"
				style={{
					maxHeight: isCollapsed ? '1000px' : '0px',
					opacity: isCollapsed ? 1 : 0,
				}}
			>
				{/* Root Folders */}
				{rootFolders.map((folder) => {
					const childFolders = folders.filter((f) => f.parent_folder_id === folder.id)
					const folderDocuments = documents.filter((d) => d.folder_id === folder.id)

					return (
						<SidebarFolderItem
							key={folder.id}
							folder={folder}
							workspaceId={workspace.id}
							documents={folderDocuments}
							childFolders={childFolders}
							allFolders={folders}
							allDocuments={documents}
							depth={1}
							canEdit={canEdit}
							canDelete={canDelete}
							onInvalidate={onInvalidate}
							onCreateDocument={(folder) => onOpenCreateDocumentModal?.(workspace, folder)}
							onCreateFolder={(folder) => onOpenCreateFolderModal?.(workspace, folder)}
						/>
					)
				})}

				{/* Root Documents */}
				{rootDocuments.map((doc) => (
					<SidebarDocumentItem
						key={doc.id}
						document={doc}
						workspaceId={workspace.id}
						depth={1}
						canEdit={canEdit}
						canDelete={canDelete}
						onInvalidate={onInvalidate}
					/>
				))}

				{/* Create Document Button */}
				{rootDocuments.length < 3 && (
					<SidebarNewDocumentButton
						id={workspace.id}
						depth={1}
						onSelect={() => onOpenCreateDocumentModal?.(workspace, undefined)}
					/>
				)}
			</div>
		</div>
	)
}
