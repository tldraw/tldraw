'use client'

import { ChevronDown, Search } from 'lucide-react'
import { SidebarContext } from './Sidebar'
import { SIDEBAR_ITEM_HOVERABLE } from './sidebar-styles'

interface SidebarContextHeaderProps {
	currentContext: SidebarContext
	onContextChange: (context: SidebarContext) => void
	onSearchClick: () => void
}

const contextLabels: Record<SidebarContext, string> = {
	workspaces: 'Workspaces',
	recent: 'Recent',
	'shared-with-me': 'Shared with me',
}

/**
 * SidebarContextHeader (Tier 2)
 *
 * Context-specific navigation header below global header.
 *
 * Features:
 * - Context dropdown (Workspaces/Recent/Shared with me)
 * - Context-specific search button
 * - Fixed to top of sidebar (below global header)
 */
export function SidebarContextHeader({
	currentContext,
	onContextChange,
	onSearchClick,
}: SidebarContextHeaderProps) {
	const handleContextClick = () => {
		// Cycle through contexts for MVP (can add proper dropdown later)
		const contexts: SidebarContext[] = ['workspaces', 'recent', 'shared-with-me']
		const currentIndex = contexts.indexOf(currentContext)
		const nextIndex = (currentIndex + 1) % contexts.length
		onContextChange(contexts[nextIndex])
	}

	return (
		<div
			className="flex items-center justify-between pr-2 mb-2"
			data-testid="sidebar-context-header"
		>
			{/* Context Switcher */}
			<button
				onClick={handleContextClick}
				className={`flex items-center gap-2 rounded h-10 px-3 flex-1 ${SIDEBAR_ITEM_HOVERABLE}`}
				data-testid="context-switcher"
			>
				<span className="font-medium ">{contextLabels[currentContext]}</span>
				<ChevronDown className="w-3 h-3 text-foreground/60" />
			</button>

			{/* Context Search */}
			<button
				onClick={onSearchClick}
				className="p-2 hover:bg-foreground/5 rounded"
				aria-label={`Search within ${contextLabels[currentContext]}`}
				title={`Search ${contextLabels[currentContext]}`}
				data-testid="context-search-button"
			>
				<Search className="w-4 h-4" />
			</button>
		</div>
	)
}
