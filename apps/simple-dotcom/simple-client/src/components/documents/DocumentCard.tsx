'use client'

// DocumentCard Component
// Card/grid view variant for document display

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatUserDisplayName } from '../users/formatUserDisplayName'
import { DocumentActions } from './DocumentActions'

interface DocumentCardProps {
	document: {
		id: string
		name: string
		created_at: string
		updated_at: string
		is_archived?: boolean
		created_by?: {
			id?: string
			name?: string | null
			display_name?: string | null
			email?: string
		} | null
	}
	onClick?: () => void
	onRename?: (newName: string) => void
	onDuplicate?: () => void
	onMove?: () => void
	onArchive?: () => void
	onRestore?: () => void
	onDelete?: () => void
	canEdit?: boolean
	canDelete?: boolean
	selected?: boolean
	className?: string
}

export function DocumentCard({
	document,
	onClick,
	onRename,
	onDuplicate,
	onMove,
	onArchive,
	onRestore,
	onDelete,
	canEdit = false,
	canDelete = false,
	selected = false,
	className = '',
}: DocumentCardProps) {
	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

		if (diffDays === 0) {
			return 'Today'
		} else if (diffDays === 1) {
			return 'Yesterday'
		} else if (diffDays < 7) {
			return `${diffDays} days ago`
		} else {
			return date.toLocaleDateString()
		}
	}

	return (
		<Card
			className={cn(
				'group relative cursor-pointer transition-all hover:shadow-md',
				selected && 'ring-2 ring-blue-500',
				document.is_archived && 'opacity-60',
				className
			)}
			onClick={onClick}
			data-testid={`document-${document.id}`}
		>
			{/* Thumbnail area */}
			<div className="aspect-[4/3] bg-muted rounded-t-xl flex items-center justify-center">
				<svg
					className="w-16 h-16 text-muted-foreground/40"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>

				{/* Actions overlay */}
				<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
					<DocumentActions
						document={document}
						onRename={onRename}
						onDuplicate={onDuplicate}
						onMove={onMove}
						onArchive={onArchive}
						onRestore={onRestore}
						onDelete={onDelete}
						canEdit={canEdit}
						canDelete={canDelete}
					/>
				</div>

				{/* Archived badge */}
				{document.is_archived && (
					<div className="absolute top-2 left-2">
						<Badge variant="secondary" className="bg-gray-900/75 text-white">
							Archived
						</Badge>
					</div>
				)}
			</div>

			{/* Content */}
			<CardContent className="p-4">
				<h3 className="font-medium truncate mb-1">{document.name}</h3>
				<div className="text-xs text-muted-foreground">
					<div>{formatDate(document.updated_at)}</div>
					{document.created_by && (
						<div className="truncate mt-0.5">by {formatUserDisplayName(document.created_by)}</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
