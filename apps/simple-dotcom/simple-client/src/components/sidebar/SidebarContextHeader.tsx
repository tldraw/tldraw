'use client'

import { cn } from '@/lib/utils'
import { ChevronsUpDownIcon, Search } from 'lucide-react'
import { Button } from '../ui/button'
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
			className="flex items-center justify-between pl-0 pr-1 mb-2"
			data-testid="sidebar-context-header"
		>
			{/* Context Switcher */}
			<Button
				variant="include"
				size="default"
				onClick={handleContextClick}
				className={cn(
					SIDEBAR_ITEM_HOVERABLE,
					`flex justify-start items-center gap-1 rounded px-3 flex-1 group`
				)}
				data-testid="context-switcher"
			>
				<span className="font-medium ">{contextLabels[currentContext]}</span>
				<ChevronsUpDownIcon className="size-2 text-foreground/30 group-hover:text-foreground/60" />
			</Button>

			{/* Context Search */}
			<Button
				variant="hoverable"
				size="icon"
				onClick={onSearchClick}
				aria-label={`Search within ${contextLabels[currentContext]}`}
				title={`Search ${contextLabels[currentContext]}`}
				data-testid="context-search-button"
			>
				<Search className="size-4" />
			</Button>
		</div>
	)
}
