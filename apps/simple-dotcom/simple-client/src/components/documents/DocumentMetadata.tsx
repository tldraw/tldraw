'use client'

import { Document } from '@/lib/api/types'
import { formatDistanceToNow } from 'date-fns'

interface DocumentMetadataProps {
	document: Document
	isGuest?: boolean
}

export default function DocumentMetadata({ document, isGuest = false }: DocumentMetadataProps) {
	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		const formatted = formatDistanceToNow(date, { addSuffix: true })
		return formatted
	}

	const formatFullDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	// Guests see limited metadata
	if (isGuest) {
		return (
			<div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
				<div className="flex items-center gap-4 text-sm text-gray-600">
					<span>Last updated {formatDate(document.updated_at)}</span>
				</div>
			</div>
		)
	}

	// Members see full metadata
	return (
		<div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
			<div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
				{document.creator && (
					<div className="flex items-center gap-1">
						<span className="font-medium">Created by:</span>
						<span>{document.creator.display_name || document.creator.email}</span>
					</div>
				)}
				<div className="flex items-center gap-1" title={formatFullDate(document.created_at)}>
					<span className="font-medium">Created:</span>
					<span>{formatDate(document.created_at)}</span>
				</div>
				<div className="flex items-center gap-1" title={formatFullDate(document.updated_at)}>
					<span className="font-medium">Last updated:</span>
					<span>{formatDate(document.updated_at)}</span>
				</div>
				{document.is_archived && document.archived_at && (
					<div className="flex items-center gap-1">
						<span className="rounded bg-orange-100 px-2 py-0.5 text-orange-700">
							Archived {formatDate(document.archived_at)}
						</span>
					</div>
				)}
			</div>
		</div>
	)
}
