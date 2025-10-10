'use client'

import { useLocalStorageState } from '@/app/hooks/useLocalStorageState'
import { Document, Folder, RecentDocument, User, Workspace, WorkspaceRole } from '@/lib/api/types'
import { useEffect, useState } from 'react'
import { SearchDialog } from './SearchDialog'
import { SidebarContent } from './SidebarContent'
import { SidebarContextHeader } from './SidebarContextHeader'
import { SidebarFooter } from './SidebarFooter'
import { SidebarGlobalHeader } from './SidebarGlobalHeader'

export type SidebarContext = 'workspaces' | 'recent' | 'shared-with-me'

interface WorkspaceWithContent {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
	userRole: WorkspaceRole
}

interface SidebarProps {
	workspaces: WorkspaceWithContent[]
	recentDocuments: RecentDocument[]
	userProfile: User | null
	userId: string
	onInvalidate: () => void
	onOpenRenameModal: (workspace: Workspace) => void
	onOpenDeleteModal: (workspace: Workspace) => void
	onOpenCreateDocumentModal: (workspace: Workspace, folder?: Folder) => void
}

/**
 * Sidebar
 *
 * Main sidebar navigation container for Simple tldraw.
 *
 * Features:
 * - Two-tier header system (Global + Context)
 * - Context-aware content (Workspaces/Recent/Shared with me)
 * - localStorage persistence for context preference
 * - Collapsible workspace sections
 * - Folder tree navigation
 * - Recent documents view
 * - User profile link
 * - Help menu
 */
export function Sidebar({
	workspaces,
	recentDocuments,
	userProfile,
	userId,
	onInvalidate,
	onOpenRenameModal,
	onOpenDeleteModal,
	onOpenCreateDocumentModal,
}: SidebarProps) {
	// Context state (persisted to localStorage)
	const [currentContext, setCurrentContext] = useLocalStorageState<SidebarContext>(
		'sidebar-context',
		'workspaces'
	)

	// Search dialog state
	const [searchOpen, setSearchOpen] = useState(false)
	const [searchContext, setSearchContext] = useState<SidebarContext>('workspaces')

	// Global keyboard shortcut (⌘K / Ctrl+K)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault()
				setSearchContext('workspaces') // Global search always searches all workspaces
				setSearchOpen(true)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [])

	const handleContextSearchClick = () => {
		setSearchContext(currentContext)
		setSearchOpen(true)
	}

	return (
		<>
			<div
				className="w-80 h-full border-r border-foreground/20 flex flex-col bg-background shrink-0"
				data-testid="sidebar"
			>
				{/* Global Header (Tier 1) */}
				<SidebarGlobalHeader />

				{/* Context Header (Tier 2) */}
				<SidebarContextHeader
					currentContext={currentContext}
					onContextChange={setCurrentContext}
					onSearchClick={handleContextSearchClick}
				/>

				{/* Main Content Area (scrollable) */}
				<SidebarContent
					currentContext={currentContext}
					workspaces={workspaces}
					recentDocuments={recentDocuments}
					userId={userId}
					onInvalidate={onInvalidate}
					onOpenRenameModal={onOpenRenameModal}
					onOpenDeleteModal={onOpenDeleteModal}
					onOpenCreateDocumentModal={onOpenCreateDocumentModal}
				/>

				{/* Footer */}
				<SidebarFooter userProfile={userProfile} />
			</div>

			{/* Search Dialog */}
			<SearchDialog
				open={searchOpen}
				onOpenChange={setSearchOpen}
				searchContext={searchContext}
				userId={userId}
			/>
		</>
	)
}
