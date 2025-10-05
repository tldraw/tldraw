'use client'

// FolderListItem Component
// Folder display in list views

import React, { useState } from 'react'
import { FolderActions } from './FolderActions'

interface FolderListItemProps {
	folder: {
		id: string
		name: string
		parent_folder_id?: string | null
	}
	onClick?: () => void
	onRename?: (newName: string) => void
	onMove?: (targetFolderId: string | null) => void
	onDelete?: () => void
	canEdit?: boolean
	canDelete?: boolean
	hasChildren?: boolean
	level?: number
	className?: string
}

export function FolderListItem({
	folder,
	onClick,
	onRename,
	onMove,
	onDelete,
	canEdit = false,
	canDelete = false,
	hasChildren = false,
	level = 0,
	className = '',
}: FolderListItemProps) {
	const [isExpanded, setIsExpanded] = useState(false)

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation()
		setIsExpanded(!isExpanded)
	}

	return (
		<div className={className}>
			<div
				className={`
					group flex items-center justify-between px-4 py-2
					hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer
					border-b border-gray-100 dark:border-gray-800
					transition-colors
				`}
				style={{ paddingLeft: `${16 + level * 20}px` }}
				onClick={onClick}
			>
				<div className="flex-1 flex items-center gap-2 min-w-0">
					{/* Expand/collapse chevron */}
					{hasChildren && (
						<button
							onClick={handleToggle}
							className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
							aria-label={isExpanded ? 'Collapse' : 'Expand'}
						>
							<svg
								className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
									isExpanded ? 'rotate-90' : ''
								}`}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</button>
					)}
					{!hasChildren && <div className="w-6" />}

					{/* Folder icon */}
					<svg
						className={`w-5 h-5 flex-shrink-0 ${
							isExpanded ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
						}`}
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						{isExpanded ? (
							<path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
						) : (
							<path
								fillRule="evenodd"
								d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4z"
								clipRule="evenodd"
							/>
						)}
					</svg>

					{/* Folder name */}
					<span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
						{folder.name}
					</span>
				</div>

				{/* Actions */}
				<div className="opacity-0 group-hover:opacity-100 transition-opacity">
					<FolderActions
						folder={folder}
						onRename={onRename}
						onMove={onMove}
						onDelete={onDelete}
						canEdit={canEdit}
						canDelete={canDelete}
					/>
				</div>
			</div>
		</div>
	)
}
