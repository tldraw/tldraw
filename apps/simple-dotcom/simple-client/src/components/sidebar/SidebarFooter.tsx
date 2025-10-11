'use client'

import { User as UserType } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { HelpCircle, UserCircleIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '../ui/button'
import { SIDEBAR_ITEM_HOVERABLE } from './sidebar-styles'

interface SidebarFooterProps {
	userProfile: UserType | null
}

/**
 * SidebarFooter
 *
 * Fixed footer at bottom of sidebar.
 *
 * Features:
 * - User link (left side) - Links to /profile
 * - Help button (right side) - Opens help menu or docs
 * - Bullet indicator for logged-in state
 */
export function SidebarFooter({ userProfile }: SidebarFooterProps) {
	const displayName = userProfile?.display_name || userProfile?.name || 'User'

	const handleHelpClick = () => {
		// TODO: Open help menu or link to docs (Phase 5)
		console.log('Help clicked')
	}

	return (
		<div className="flex items-center justify-between pr-1 h-10" data-testid="sidebar-footer">
			{/* User Link */}
			<Link
				href="/profile"
				className={cn(SIDEBAR_ITEM_HOVERABLE, 'flex items-center gap-2 px-2 py-1 flex-1 min-w-0')}
				data-testid="sidebar-user-link"
			>
				<UserCircleIcon className="size-4" />
				<span className=" truncate" title={displayName}>
					{displayName}
				</span>
			</Link>

			{/* Help Button */}
			<Button
				variant="hoverable"
				size="icon"
				onClick={handleHelpClick}
				className="p-2"
				aria-label="Help"
				title="Help"
				data-testid="sidebar-help-button"
			>
				<HelpCircle className="size-4" />
			</Button>
		</div>
	)
}
