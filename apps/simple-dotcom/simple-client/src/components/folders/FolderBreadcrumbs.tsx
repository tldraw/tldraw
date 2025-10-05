'use client'

// FolderBreadcrumbs Component
// Breadcrumb navigation for folder hierarchy

import React, { useMemo } from 'react'

interface Folder {
	id: string
	name: string
	parent_folder_id?: string | null
}

interface FolderBreadcrumbsProps {
	folders: Folder[]
	currentFolderId?: string | null
	onFolderClick?: (folderId: string | null) => void
	showRoot?: boolean
	rootLabel?: string
	className?: string
}

export function FolderBreadcrumbs({
	folders,
	currentFolderId,
	onFolderClick,
	showRoot = true,
	rootLabel = 'All Files',
	className = '',
}: FolderBreadcrumbsProps) {
	// Build breadcrumb path
	const breadcrumbs = useMemo(() => {
		if (!currentFolderId) {
			return []
		}

		const folderMap = new Map(folders.map((f) => [f.id, f]))
		const path: Folder[] = []
		let current = folderMap.get(currentFolderId)

		while (current) {
			path.unshift(current)
			current = current.parent_folder_id ? folderMap.get(current.parent_folder_id) : undefined
		}

		return path
	}, [folders, currentFolderId])

	return (
		<nav className={`flex items-center gap-1 text-sm ${className}`} aria-label="Breadcrumb">
			{/* Root/Home */}
			{showRoot && (
				<>
					<button
						onClick={() => onFolderClick?.(null)}
						className={`
							px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
							${!currentFolderId ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}
						`}
					>
						{rootLabel}
					</button>

					{breadcrumbs.length > 0 && (
						<svg
							className="w-4 h-4 text-gray-400 dark:text-gray-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					)}
				</>
			)}

			{/* Folder path */}
			{breadcrumbs.map((folder, index) => (
				<React.Fragment key={folder.id}>
					{index > 0 && (
						<svg
							className="w-4 h-4 text-gray-400 dark:text-gray-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					)}
					<button
						onClick={() => onFolderClick?.(folder.id)}
						className={`
							px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
							${
								index === breadcrumbs.length - 1
									? 'font-medium text-gray-900 dark:text-gray-100'
									: 'text-gray-600 dark:text-gray-400'
							}
						`}
					>
						{folder.name}
					</button>
				</React.Fragment>
			))}
		</nav>
	)
}
