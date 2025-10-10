'use client'

import { Columns2, Search } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '../shared/Logo'

interface SidebarGlobalHeaderProps {
	onSearchClick: () => void
}

/**
 * SidebarGlobalHeader (Tier 1)
 *
 * Top header for global app-level navigation.
 *
 * Features:
 * - tldraw branding/logo (links to marketing page)
 * - Global menu button (future: dropdown for settings, sign out, etc.)
 * - Global search button (⌘K to search across all workspaces)
 */
export function SidebarGlobalHeader({ onSearchClick }: SidebarGlobalHeaderProps) {
	const handleMenuClick = () => {
		// TODO: Open global menu dropdown (Phase 5)
		console.log('Global menu clicked')
	}

	return (
		<div
			className="flex items-center justify-between p-4 border-b border-foreground/20"
			data-testid="sidebar-global-header"
		>
			{/* Branding */}
			<Link href="/" className="flex items-center gap-2 hover:opacity-80">
				<Logo className="h-5 text-foreground" />
			</Link>

			{/* Actions */}
			<div className="flex items-center gap-1">
				<button
					onClick={onSearchClick}
					className="p-2 hover:bg-foreground/5 rounded"
					aria-label="Global search (⌘K)"
					title="Search (⌘K)"
					data-testid="global-search-button"
				>
					<Search className="w-4 h-4" />
				</button>
				<button
					onClick={handleMenuClick}
					className="p-2 hover:bg-foreground/5 rounded"
					aria-label="Global menu"
					title="Menu"
					data-testid="global-menu-button"
				>
					<Columns2 className="w-4 h-4" />
				</button>
			</div>
		</div>
	)
}
