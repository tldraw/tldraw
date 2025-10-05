'use client'

// DocumentCard Component
// Card/grid view variant for document display

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
		<div
			className={`
				group relative bg-white dark:bg-gray-800 rounded-lg border
				${
					selected
						? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
						: 'border-gray-200 dark:border-gray-700'
				}
				hover:shadow-md transition-all cursor-pointer
				${document.is_archived ? 'opacity-60' : ''}
				${className}
			`}
			onClick={onClick}
		>
			{/* Thumbnail area */}
			<div className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 rounded-t-lg flex items-center justify-center">
				<svg
					className="w-16 h-16 text-gray-300 dark:text-gray-600"
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
						<span className="text-xs bg-gray-900/75 text-white px-2 py-1 rounded">Archived</span>
					</div>
				)}
			</div>

			{/* Content */}
			<div className="p-4">
				<h3 className="font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
					{document.name}
				</h3>
				<div className="text-xs text-gray-500 dark:text-gray-400">
					<div>{formatDate(document.updated_at)}</div>
					{document.created_by && (
						<div className="truncate mt-0.5">by {formatUserDisplayName(document.created_by)}</div>
					)}
				</div>
			</div>
		</div>
	)
}
