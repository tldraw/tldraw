'use client'

import { DocumentActions } from '@/components/documents/DocumentActions'
import { useDocumentActions } from '@/hooks/useDocumentActions'
import { Document } from '@/lib/api/types'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarDocumentItemProps {
	document: Document
	workspaceId: string
	depth?: number
	canEdit: boolean
	canDelete: boolean
	onInvalidate?: () => void
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

	return (
		<div
			className="group flex items-center justify-between px-2 py-1 text-sm rounded hover:bg-foreground/5 data-[active=true]:bg-foreground/10"
			data-active={isActive}
			data-testid={`sidebar-document-${document.id}`}
			style={{ paddingLeft: `${8 + depth * 16}px` }}
		>
			<Link href={`/d/${document.id}`} className="flex-1 flex items-center gap-1 min-w-0">
				<span className="shrink-0">📄</span>
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
