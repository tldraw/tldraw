'use client'

import { DocumentActions } from '@/components/documents/DocumentActions'
import { useDocumentActions } from '@/hooks/useDocumentActions'
import { Document, RecentDocument } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { Archive, Share2 } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { SIDEBAR_ITEM_ACTIVE } from './sidebar-styles'
import { SidebarDepthIndicator } from './SidebarDepthIndicator'

interface SidebarDocumentItemProps {
	document: Document | RecentDocument
	workspaceId?: string
	depth?: number
	canEdit?: boolean
	canDelete?: boolean
	onInvalidate?: () => void
	showActions?: boolean
}

/**
 * SidebarDocumentItem
 *
 * Renders an individual document in the sidebar with:
 * - Link to document view (/d/{documentId})
 * - Active state highlighting (if current route matches)
 * - Hover-triggered DocumentActions menu (optional)
 * - Depth-based indentation for nested folders
 * - Status icons (archived, shared)
 */
export function SidebarDocumentItem({
	document,
	depth = 0,
	canEdit = false,
	canDelete = false,
	onInvalidate,
	showActions = true,
}: SidebarDocumentItemProps) {
	const pathname = usePathname()
	const isActive = pathname === `/d/${document.id}`
	const [isMenuOpen, setIsMenuOpen] = useState(false)

	const {
		handleDocumentRename,
		handleDocumentDuplicate,
		handleDocumentArchive,
		handleDocumentRestore,
		handleDocumentDelete,
	} = useDocumentActions({ onInvalidate })

	// Type guard to check if document is a full Document (has all fields)
	const isFullDocument = (doc: Document | RecentDocument): doc is Document => {
		return 'created_by' in doc && 'created_at' in doc
	}

	// Determine document status indicator
	const getStatusIndicator = () => {
		if (document.is_archived) {
			return { icon: Archive, color: 'text-muted-foreground/60', label: 'Archived' }
		}
		if (document.sharing_mode !== 'private') {
			return { icon: Share2, color: 'text-blue-500 dark:text-blue-400', label: 'Shared' }
		}
		return null
	}

	const statusIndicator = getStatusIndicator()
	const StatusIcon = statusIndicator?.icon

	return (
		<div
			className={cn(SIDEBAR_ITEM_ACTIVE, 'group/item pl-2 justify-between')}
			data-active={isActive}
			data-testid={`sidebar-document-${document.id}`}
		>
			<SidebarDepthIndicator depth={depth} />
			<Link href={`/d/${document.id}`} className="flex-1 h-full flex items-center gap-2 min-w-0">
				{StatusIcon && (
					<span title={statusIndicator.label}>
						<StatusIcon
							className={`w-3 h-3 shrink-0 ${statusIndicator.color}`}
							aria-label={statusIndicator.label}
						/>
					</span>
				)}
				<span className="truncate" title={document.name}>
					{document.name}
				</span>
			</Link>
			{showActions && isFullDocument(document) && (
				<div
					className={`shrink-0 ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-60 hover:opacity-100'}`}
					onClick={(e) => e.stopPropagation()}
				>
					<DocumentActions
						document={document}
						onRename={(newName) => handleDocumentRename(document.id, newName)}
						onDuplicate={() => handleDocumentDuplicate(document.id)}
						onArchive={() => handleDocumentArchive(document.id)}
						onRestore={() => handleDocumentRestore(document.id)}
						onDelete={() => handleDocumentDelete(document.id)}
						canEdit={canEdit}
						canDelete={canDelete}
						onMenuOpenChange={setIsMenuOpen}
					/>
				</div>
			)}
		</div>
	)
}
