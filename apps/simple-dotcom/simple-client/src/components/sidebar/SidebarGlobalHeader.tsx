'use client'

import { Columns2 } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '../shared/Logo'
import { NewFileIcon } from '../shared/NewFileIcon'
import { Button } from '../ui/button'

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
export function SidebarGlobalHeader({ onCreateFile }: { onCreateFile: () => void }) {
	const handleMenuClick = () => {
		// TODO: Open global menu dropdown (Phase 5)
		console.log('Global menu clicked')
	}

	return (
		<div
			className="flex items-center justify-between h-10 pl-3 pr-1 mb-2"
			data-testid="sidebar-global-header"
		>
			{/* Branding */}
			<Link href="/" className="flex items-center gap-2 hover:opacity-80">
				<Logo className="h-[18px] text-foreground" />
			</Link>

			{/* Actions */}
			<div className="flex items-center">
				<Button
					variant="hoverable"
					size="icon"
					onClick={onCreateFile}
					aria-label="Global menu"
					title="Menu"
					data-testid="global-menu-button"
				>
					<NewFileIcon className="size-4" />
				</Button>
				<Button
					variant="hoverable"
					size="icon"
					onClick={handleMenuClick}
					aria-label="Global menu"
					title="Menu"
					data-testid="global-menu-button"
				>
					<Columns2 className="size-4" />
				</Button>
			</div>
		</div>
	)
}
