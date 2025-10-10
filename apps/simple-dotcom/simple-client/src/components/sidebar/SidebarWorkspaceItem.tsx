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
import { FileText, FolderPlus, Link2, MoreVertical, Settings } from 'lucide-react'
import Link from 'next/link'
import { useCallback } from 'react'
import { SidebarDocumentItem } from './SidebarDocumentItem'
import { SidebarFolderItem } from './SidebarFolderItem'
import { SidebarNewDocumentButton } from './SidebarNewDocumentButton'
import { SIDEBAR_ITEM_HOVERABLE } from './sidebar-styles'

interface SidebarWorkspaceItemProps {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
	userRole: WorkspaceRole
	userId: string
	onCollapsedToggle?: (workspaceId: string) => void
	onCollapsedShiftToggle?: (workspaceId: string) => void
	isCollapsed: boolean
	onInvalidate?: () => void
	onOpenRenameModal?: (workspace: Workspace) => void
	onOpenDeleteModal?: (workspace: Workspace) => void
	onOpenCreateDocumentModal?: (workspace: Workspace, folder?: Folder) => void
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
	onOpenDeleteModal,
	onOpenCreateDocumentModal,
}: SidebarWorkspaceItemProps) {
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
	const canEdit = userRole === 'owner' || userRole === 'member'
	const canDelete = userRole === 'owner'

	// Separate root-level folders and documents
	const rootFolders = folders.filter((f) => !f.parent_folder_id)
	const rootDocuments = documents.filter((d) => !d.folder_id && !d.is_archived)

	return (
		<div className="overflow-hidden group mb-2" data-testid={`sidebar-workspace-${workspace.id}`}>
			{/* Workspace Header */}
			<div className={`${SIDEBAR_ITEM_HOVERABLE} justify-between`}>
				<div className="flex-1 flex items-center gap-2 min-w-0">
					<Button
						variant="include"
						size="icon"
						onClick={handleToggle}
						className="shrink-0 h-full w-4 p-0 text-[10px]"
						aria-label={isCollapsed ? 'Expand workspace' : 'Collapse workspace'}
						aria-expanded={!isCollapsed}
						data-testid={`toggle-workspace-${workspace.name
							.toLowerCase()
							.replace(/\s+/g, '-')
							.replace(/[^a-z0-9-]/g, '')}`}
					>
						{isCollapsed ? '▼' : '▶'}
					</Button>
					<Link
						href={`/workspace/${workspace.id}`}
						className="flex-1 hover:opacity-80 min-w-0"
						data-testid={`workspace-card-${workspace.id}`}
					>
						<h3 className="font-medium  truncate" title={workspace.name}>
							{workspace.name}
						</h3>
					</Link>
				</div>

				{/* Workspace Actions */}
				{!workspace.is_private && isOwner && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								className="shrink-0 p-1 hover:bg-foreground/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
								aria-label="Workspace menu"
								data-testid={`workspace-menu-${workspace.id}`}
								onClick={(e) => e.stopPropagation()}
							>
								<MoreVertical className="w-4 h-4" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation()
									navigator.clipboard.writeText(
										window.location.origin + `/workspace/${workspace.id}`
									)
								}}
								data-testid={`copy-workspace-link-${workspace.id}`}
							>
								<Link2 className="w-4 h-4" />
								<span>Copy link</span>
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation()
									onOpenRenameModal?.(workspace)
								}}
								data-testid={`rename-workspace-${workspace.id}`}
							>
								<Settings className="w-4 h-4" />
								<span>Settings</span>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation()
									onOpenCreateDocumentModal?.(workspace, undefined)
								}}
								data-testid={`create-document-${workspace.id}`}
							>
								<FileText className="w-4 h-4" />
								<span>Document</span>
								<span className="ml-auto text-foreground/40">+</span>
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation()
									// TODO: Implement create folder
								}}
								data-testid={`create-folder-${workspace.id}`}
							>
								<FolderPlus className="w-4 h-4" />
								<span>Folder</span>
								<span className="ml-auto text-foreground/40">+</span>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation()
									onOpenDeleteModal?.(workspace)
								}}
								data-testid={`delete-workspace-${workspace.id}`}
								className="text-red-500 focus:text-red-500"
							>
								<span>Delete workspace</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>

			{/* Workspace Content */}
			{isCollapsed && (
				<div data-testid={`workspace-content-${workspace.id}`}>
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
								depth={0}
								canEdit={canEdit}
								canDelete={canDelete}
								onInvalidate={onInvalidate}
								onCreateDocument={(folder) => onOpenCreateDocumentModal?.(workspace, folder)}
							/>
						)
					})}

					{/* Root Documents */}
					{rootDocuments.map((doc) => (
						<SidebarDocumentItem
							key={doc.id}
							document={doc}
							workspaceId={workspace.id}
							depth={0}
							canEdit={canEdit}
							canDelete={canDelete}
							onInvalidate={onInvalidate}
						/>
					))}

					{/* Create Document Button */}
					{(!workspace.is_private || isOwner) && (
						<SidebarNewDocumentButton
							onSelect={() => onOpenCreateDocumentModal?.(workspace, undefined)}
							id={workspace.id}
						/>
					)}

					{/* Empty state */}
					{rootFolders.length === 0 && rootDocuments.length === 0 && (
						<p className="text-xs text-foreground/40 italic">No items yet</p>
					)}
				</div>
			)}
		</div>
	)
}
