'use client'

import { User as UserType } from '@/lib/api/types'
import { HelpCircle, User } from 'lucide-react'
import Link from 'next/link'

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
		<div
			className="flex items-center justify-between px-4 py-3 border-t border-foreground/20 mt-auto"
			data-testid="sidebar-footer"
		>
			{/* User Link */}
			<Link
				href="/profile"
				className="flex items-center gap-2 hover:bg-foreground/5 rounded px-2 py-1 flex-1 min-w-0"
				data-testid="sidebar-user-link"
			>
				<User className="w-4 h-4 shrink-0" />
				<span className="text-sm truncate" title={displayName}>
					{displayName}
				</span>
				<span className="text-xs text-foreground/60 shrink-0">●</span>
			</Link>

			{/* Help Button */}
			<button
				onClick={handleHelpClick}
				className="p-2 hover:bg-foreground/5 rounded shrink-0"
				aria-label="Help"
				title="Help"
				data-testid="sidebar-help-button"
			>
				<HelpCircle className="w-4 h-4" />
			</button>
		</div>
	)
}
