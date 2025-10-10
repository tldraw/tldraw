'use client'

import { DocumentActions } from '@/components/documents/DocumentActions'
import { useDocumentActions } from '@/hooks/useDocumentActions'
import { Document } from '@/lib/api/types'
import { Archive, Clock, Share2 } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SIDEBAR_ITEM_ACTIVE } from './sidebar-styles'
import { SidebarDepthIndicator } from './SidebarDepthIndicator'

interface SidebarDocumentItemProps {
	document: Document
	workspaceId: string
	depth?: number
	canEdit: boolean
	canDelete: boolean
	onInvalidate?: () => void
	isRecent?: boolean
}

/**
 * SidebarDocumentItem
 *
 * Renders an individual document in the sidebar with:
 * - Link to document view (/d/{documentId})
 * - Active state highlighting (if current route matches)
 * - Hover-triggered DocumentActions menu
 * - Depth-based indentation for nested folders
 */
export function SidebarDocumentItem({
	document,
	depth = 0,
	canEdit,
	canDelete,
	onInvalidate,
	isRecent = false,
}: SidebarDocumentItemProps) {
	const pathname = usePathname()
	const isActive = pathname === `/d/${document.id}`

	const {
		handleDocumentRename,
		handleDocumentDuplicate,
		handleDocumentArchive,
		handleDocumentRestore,
		handleDocumentDelete,
	} = useDocumentActions({ onInvalidate })

	// Determine document status indicator
	const getStatusIndicator = () => {
		if (document.is_archived) {
			return { icon: Archive, color: 'text-muted-foreground/60', label: 'Archived' }
		}
		if (document.sharing_mode !== 'private') {
			return { icon: Share2, color: 'text-blue-500 dark:text-blue-400', label: 'Shared' }
		}
		if (isRecent) {
			return { icon: Clock, color: 'text-green-500 dark:text-green-400', label: 'Recent' }
		}
		return null
	}

	const statusIndicator = getStatusIndicator()
	const StatusIcon = statusIndicator?.icon

	return (
		<div
			className={`group ${SIDEBAR_ITEM_ACTIVE} justify-between `}
			data-active={isActive}
			data-testid={`sidebar-document-${document.id}`}
		>
			<SidebarDepthIndicator depth={depth} />
			<Link href={`/d/${document.id}`} className="flex-1 flex items-center gap-2 min-w-0">
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
			<div
				className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
				/>
			</div>
		</div>
	)
}
