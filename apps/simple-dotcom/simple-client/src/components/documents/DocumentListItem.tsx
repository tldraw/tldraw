'use client'

// DocumentListItem Component
// List view variant for document display

import { formatUserDisplayName } from '../users/formatUserDisplayName'
import { DocumentActions } from './DocumentActions'

interface DocumentListItemProps {
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
	onArchive?: () => void
	onRestore?: () => void
	onDelete?: () => void
	canEdit?: boolean
	canDelete?: boolean
	selected?: boolean
	className?: string
}

export function DocumentListItem({
	document,
	onClick,
	onRename,
	onDuplicate,
	onArchive,
	onRestore,
	onDelete,
	canEdit = false,
	canDelete = false,
	selected = false,
	className = '',
}: DocumentListItemProps) {
	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

		if (diffHours < 1) {
			return 'Just now'
		} else if (diffHours < 24) {
			return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
		} else if (diffDays < 30) {
			return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
		} else {
			return date.toLocaleDateString()
		}
	}

	return (
		<div
			className={`
				group flex items-center justify-between px-4 py-3
				hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer
				border-b border-gray-200 dark:border-gray-700
				${selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
				${document.is_archived ? 'opacity-60' : ''}
				transition-colors
				${className}
			`}
			onClick={onClick}
		>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					{/* Document icon */}
					<svg
						className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>

					{/* Document name */}
					<h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
						{document.name}
					</h3>

					{/* Archived badge */}
					{document.is_archived && (
						<span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
							Archived
						</span>
					)}
				</div>

				{/* Metadata */}
				<div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
					<span>Modified {formatDate(document.updated_at)}</span>
					{document.created_by && <span>by {formatUserDisplayName(document.created_by)}</span>}
				</div>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
				<DocumentActions
					document={document}
					onRename={onRename}
					onDuplicate={onDuplicate}
					onArchive={onArchive}
					onRestore={onRestore}
					onDelete={onDelete}
					canEdit={canEdit}
					canDelete={canDelete}
				/>
			</div>
		</div>
	)
}
