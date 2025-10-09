'use client'

// FolderBreadcrumbs Component
// Breadcrumb navigation for folder hierarchy

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Fragment, useMemo } from 'react'

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
		<Breadcrumb className={className}>
			<BreadcrumbList>
				{/* Root/Home */}
				{showRoot && (
					<>
						<BreadcrumbItem>
							{!currentFolderId ? (
								<BreadcrumbPage>{rootLabel}</BreadcrumbPage>
							) : (
								<BreadcrumbLink onClick={() => onFolderClick?.(null)} className="cursor-pointer">
									{rootLabel}
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>

						{breadcrumbs.length > 0 && <BreadcrumbSeparator />}
					</>
				)}

				{/* Folder path */}
				{breadcrumbs.map((folder, index) => (
					<Fragment key={folder.id}>
						{index > 0 && <BreadcrumbSeparator />}
						<BreadcrumbItem>
							{index === breadcrumbs.length - 1 ? (
								<BreadcrumbPage>{folder.name}</BreadcrumbPage>
							) : (
								<BreadcrumbLink
									onClick={() => onFolderClick?.(folder.id)}
									className="cursor-pointer"
								>
									{folder.name}
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
					</Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	)
}
