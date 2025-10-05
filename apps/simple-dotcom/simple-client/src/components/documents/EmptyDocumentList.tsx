'use client'

// EmptyDocumentList Component
// Empty state for document lists

import { EmptyState } from '../shared/EmptyState'

interface EmptyDocumentListProps {
	onCreateDocument?: () => void
	canCreate?: boolean
	isArchive?: boolean
	className?: string
}

export function EmptyDocumentList({
	onCreateDocument,
	canCreate = false,
	isArchive = false,
	className = '',
}: EmptyDocumentListProps) {
	const icon = (
		<svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={1.5}
				d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
			/>
		</svg>
	)

	if (isArchive) {
		return (
			<EmptyState
				icon={icon}
				title="No archived documents"
				description="Documents you archive will appear here"
				className={className}
			/>
		)
	}

	return (
		<EmptyState
			icon={icon}
			title="No documents yet"
			description={
				canCreate
					? 'Create your first document to get started'
					: 'Documents will appear here once created'
			}
			action={
				canCreate && onCreateDocument
					? {
							label: 'Create document',
							onClick: onCreateDocument,
						}
					: undefined
			}
			className={className}
		/>
	)
}
