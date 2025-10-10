'use client'

import { useLocalStorageState } from '@/app/hooks/useLocalStorageState'
import { SidebarWorkspaceItem } from '@/components/sidebar/SidebarWorkspaceItem'
import { Document, Folder, Workspace, WorkspaceRole } from '@/lib/api/types'
import { useCallback } from 'react'

interface WorkspaceWithContent {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
	userRole: WorkspaceRole
}

interface WorkspacesViewProps {
	workspaces: WorkspaceWithContent[]
	userId: string
	onInvalidate: () => void
	onOpenRenameModal: (workspace: Workspace) => void
	onOpenDeleteModal: (workspace: Workspace) => void
	onOpenCreateDocumentModal: (workspace: Workspace, folder?: Folder) => void
}

/**
 * WorkspacesView
 *
 * Displays all workspaces as collapsible sections with nested folders/documents.
 *
 * Features:
 * - All workspaces expanded by default
 * - Individual expand/collapse state managed in SidebarWorkspaceItem
 * - Shift+click to expand one workspace and collapse siblings
 */
export function WorkspacesView({
	workspaces,
	userId,
	onInvalidate,
	onOpenRenameModal,
	onOpenDeleteModal,
	onOpenCreateDocumentModal,
}: WorkspacesViewProps) {
	const [collapsedWorkspaces, setCollapsedWorkspaces, isLoaded] = useLocalStorageState<string[]>(
		'collapsed-workspaces',
		[]
	)

	const handleToggle = useCallback(
		(workspaceId: string) => {
			setCollapsedWorkspaces((prev) => {
				const next = [...prev]
				if (next.includes(workspaceId)) {
					next.splice(next.indexOf(workspaceId), 1)
				} else {
					next.push(workspaceId)
				}
				return next
			})
		},
		[setCollapsedWorkspaces]
	)

	const handleShiftToggle = useCallback(
		(workspaceId: string) => {
			// Expand this workspace, collapse all siblings
			const otherWorkspaceIds = workspaces
				.filter((w) => w.workspace.id !== workspaceId)
				.map((w) => w.workspace.id)

			setCollapsedWorkspaces(otherWorkspaceIds)

			// Note: Individual workspaces manage their own localStorage state
			// This just provides a way to programmatically collapse siblings
		},
		[workspaces, setCollapsedWorkspaces]
	)

	if (workspaces.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center p-6">
				<p className=" text-foreground/60 text-center">
					No workspaces yet.
					<br />
					Create your first workspace to get started!
				</p>
			</div>
		)
	}

	if (!isLoaded) {
		// todo: show skeleton or loading state
		return null
	}

	return (
		<div data-testid="workspaces-view">
			{workspaces.map(({ workspace, documents, folders, userRole }) => (
				<SidebarWorkspaceItem
					key={workspace.id}
					workspace={workspace}
					documents={documents}
					folders={folders}
					userRole={userRole}
					userId={userId}
					isCollapsed={!isLoaded || !collapsedWorkspaces.includes(workspace.id)}
					onCollapsedToggle={handleToggle}
					onCollapsedShiftToggle={handleShiftToggle}
					onInvalidate={onInvalidate}
					onOpenRenameModal={onOpenRenameModal}
					onOpenDeleteModal={onOpenDeleteModal}
					onOpenCreateDocumentModal={onOpenCreateDocumentModal}
				/>
			))}
		</div>
	)
}
