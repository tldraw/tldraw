'use client'

import { RecentDocument } from '@/lib/api/types'
import { Clock } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface RecentViewProps {
	recentDocuments: RecentDocument[]
}

/**
 * RecentView
 *
 * Displays recently accessed documents in chronological order.
 *
 * Features:
 * - Flat list (no folder hierarchy)
 * - Shows document name + workspace name
 * - Active state highlighting for current document
 * - Order cached in memory (React Query handles caching)
 * - New documents appear at top
 * - Order refreshes on page reload
 */
export function RecentView({ recentDocuments }: RecentViewProps) {
	const pathname = usePathname()

	if (recentDocuments.length === 0) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
				<Clock className="w-8 h-8 text-foreground/40" />
				<div className="text-center">
					<p className="text-sm font-medium text-foreground/80">No recent documents</p>
					<p className="text-xs text-foreground/60 mt-1">Access a document to see it here</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-1" data-testid="recent-view">
			{recentDocuments.map((recent) => {
				const isActive = pathname === `/d/${recent.id}`
				const accessDate = new Date(recent.accessed_at)
				const formattedDate = accessDate.toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
				})

				return (
					<Link
						key={recent.id}
						href={`/d/${recent.id}`}
						className="block px-3 py-2 rounded hover:bg-foreground/5 data-[active=true]:bg-foreground/10"
						data-active={isActive}
						data-testid={`recent-document-${recent.id}`}
					>
						<div className="flex items-start justify-between gap-2">
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate" title={recent.name}>
									{recent.name}
								</p>
								<p className="text-xs text-foreground/60 truncate" title={recent.workspace_name}>
									{recent.workspace_name}
								</p>
							</div>
							<span className="text-xs text-foreground/40 shrink-0">{formattedDate}</span>
						</div>
					</Link>
				)
			})}
		</div>
	)
}
