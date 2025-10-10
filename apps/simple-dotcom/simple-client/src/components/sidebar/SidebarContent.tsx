'use client'

import { Document, Folder, RecentDocument, Workspace, WorkspaceRole } from '@/lib/api/types'
import { RecentView } from './RecentView'
import { SidebarContext } from './Sidebar'
import { WorkspacesView } from './WorkspacesView'

interface WorkspaceWithContent {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
	userRole: WorkspaceRole
}

interface SidebarContentProps {
	currentContext: SidebarContext
	workspaces: WorkspaceWithContent[]
	recentDocuments: RecentDocument[]
	userId: string
	onInvalidate: () => void
	onOpenRenameModal: (workspace: Workspace) => void
	onOpenDeleteModal: (workspace: Workspace) => void
	onOpenCreateDocumentModal: (workspace: Workspace, folder?: Folder) => void
}

/**
 * SidebarContent
 *
 * Main scrollable content area that renders context-specific views.
 *
 * Features:
 * - Conditional rendering based on currentContext
 * - Smooth scrolling with overflow-y-auto
 * - Flex-1 to fill available space between headers and footer
 */
export function SidebarContent({
	currentContext,
	workspaces,
	recentDocuments,
	userId,
	onInvalidate,
	onOpenRenameModal,
	onOpenDeleteModal,
	onOpenCreateDocumentModal,
}: SidebarContentProps) {
	return (
		<div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide" data-testid="sidebar-content">
			{currentContext === 'workspaces' && (
				<WorkspacesView
					workspaces={workspaces}
					userId={userId}
					onInvalidate={onInvalidate}
					onOpenRenameModal={onOpenRenameModal}
					onOpenDeleteModal={onOpenDeleteModal}
					onOpenCreateDocumentModal={onOpenCreateDocumentModal}
				/>
			)}

			{currentContext === 'recent' && <RecentView recentDocuments={recentDocuments} />}

			{currentContext === 'shared-with-me' && (
				<div className="flex-1 flex items-center justify-center p-6">
					<p className=" text-foreground/60 text-center">
						Shared with me
						<br />
						<span className="text-xs">(Coming soon)</span>
					</p>
				</div>
			)}
		</div>
	)
}
