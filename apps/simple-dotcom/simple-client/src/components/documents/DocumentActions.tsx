'use client'

// DocumentActions Component
// Dropdown menu with document-specific actions

import { ActionMenu, type ActionMenuItem } from '../shared/ActionMenu'

interface DocumentActionsProps {
	document: {
		id: string
		name: string
		is_archived?: boolean
	}
	onRename?: (newName: string) => void
	onDuplicate?: () => void
	onArchive?: () => void
	onRestore?: () => void
	onDelete?: () => void
	canEdit?: boolean
	canDelete?: boolean
}

export function DocumentActions({
	document,
	onRename,
	onDuplicate,
	onArchive,
	onRestore,
	onDelete,
	canEdit = false,
	canDelete = false,
}: DocumentActionsProps) {
	const handleRename = () => {
		if (onRename) {
			const newName = window.prompt('Enter new name:', document.name)
			if (newName && newName.trim() && newName !== document.name) {
				onRename(newName.trim())
			}
		}
	}

	const items: ActionMenuItem[] = []

	// Edit actions (for members and owners)
	if (canEdit) {
		if (onRename) {
			items.push({
				label: 'Rename',
				onClick: handleRename,
				icon: (
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
						/>
					</svg>
				),
			})
		}

		if (onDuplicate && !document.is_archived) {
			items.push({
				label: 'Duplicate',
				onClick: onDuplicate,
				icon: (
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
						/>
					</svg>
				),
			})
		}
	}

	// Archive/restore actions
	if (document.is_archived && onRestore) {
		items.push({
			label: 'Restore',
			onClick: onRestore,
			icon: (
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
			),
		})
	} else if (!document.is_archived && onArchive && canEdit) {
		items.push({
			label: 'Archive',
			onClick: onArchive,
			icon: (
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
					/>
				</svg>
			),
		})
	}

	// Delete action (owners only)
	if (canDelete && onDelete) {
		if (items.length > 0) {
			items.push({ divider: true } as ActionMenuItem)
		}
		items.push({
			label: 'Delete permanently',
			onClick: () => {
				if (
					window.confirm(
						`Are you sure you want to permanently delete "${document.name}"? This action cannot be undone.`
					)
				) {
					onDelete()
				}
			},
			destructive: true,
			icon: (
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
			),
		})
	}

	// Don't render if no actions available
	if (items.length === 0) {
		return null
	}

	return <ActionMenu items={items} />
}
