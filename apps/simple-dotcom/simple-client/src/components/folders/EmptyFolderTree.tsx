'use client'

// EmptyFolderTree Component
// Empty state for folder tree

import { EmptyState } from '../shared/EmptyState'

interface EmptyFolderTreeProps {
	onCreateFolder?: () => void
	canCreate?: boolean
	className?: string
}

export function EmptyFolderTree({
	onCreateFolder,
	canCreate = false,
	className = '',
}: EmptyFolderTreeProps) {
	const icon = (
		<svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={1.5}
				d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
			/>
		</svg>
	)

	return (
		<EmptyState
			icon={icon}
			title="No folders yet"
			description={
				canCreate
					? 'Create folders to organize your documents'
					: 'Folders will appear here once created'
			}
			action={
				canCreate && onCreateFolder
					? {
							label: 'Create folder',
							onClick: onCreateFolder,
						}
					: undefined
			}
			className={className}
		/>
	)
}
