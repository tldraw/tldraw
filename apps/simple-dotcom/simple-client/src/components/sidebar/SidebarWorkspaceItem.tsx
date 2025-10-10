'use client'

import { Document, Folder, Workspace, WorkspaceRole } from '@/lib/api/types'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useCallback } from 'react'
import { SidebarDocumentItem } from './SidebarDocumentItem'
import { SidebarFolderItem } from './SidebarFolderItem'
import { SidebarNewDocumentButton } from './SidebarNewDocumentButton'

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
		<div className="overflow-hidden" data-testid={`sidebar-workspace-${workspace.id}`}>
			{/* Workspace Header */}
			<div className="flex items-center justify-between px-3 py-2">
				<div className="flex-1 flex items-center gap-2 min-w-0">
					<button
						onClick={handleToggle}
						className="shrink-0 p-0.5 hover:bg-foreground/10 rounded"
						aria-label={isCollapsed ? 'Expand workspace' : 'Collapse workspace'}
						aria-expanded={!isCollapsed}
						data-testid={`toggle-workspace-${workspace.name
							.toLowerCase()
							.replace(/\s+/g, '-')
							.replace(/[^a-z0-9-]/g, '')}`}
					>
						{isCollapsed ? (
							<ChevronDown className="w-4 h-4" />
						) : (
							<ChevronRight className="w-4 h-4" />
						)}
					</button>
					<Link
						href={`/workspace/${workspace.id}`}
						className="flex-1 hover:opacity-80 min-w-0"
						data-testid={`workspace-card-${workspace.id}`}
					>
						<h3 className="font-medium text-sm truncate" title={workspace.name}>
							{workspace.name}
						</h3>
					</Link>
				</div>

				{/* Workspace Actions */}
				{!workspace.is_private && isOwner && (
					<div className="flex items-center gap-1 shrink-0">
						<button
							onClick={(e) => {
								e.stopPropagation()
								onOpenRenameModal?.(workspace)
							}}
							data-testid={`rename-workspace-${workspace.id}`}
							className="rounded px-2 py-1 text-xs hover:bg-foreground/10"
						>
							Rename
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation()
								onOpenDeleteModal?.(workspace)
							}}
							data-testid={`delete-workspace-${workspace.id}`}
							className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
						>
							Delete
						</button>
					</div>
				)}
			</div>

			{/* Workspace Content */}
			{isCollapsed && (
				<div className="p-3 space-y-1" data-testid={`workspace-content-${workspace.id}`}>
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
