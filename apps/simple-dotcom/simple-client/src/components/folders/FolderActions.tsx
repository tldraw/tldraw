'use client'

// FolderActions Component
// Dropdown menu with folder-specific actions

import { ActionMenu, type ActionMenuItem } from '../shared/ActionMenu'

interface FolderActionsProps {
	folder: {
		id: string
		name: string
	}
	onRename?: (newName: string) => void
	onMove?: (targetFolderId: string | null) => void
	onDelete?: () => void
	canEdit?: boolean
	canDelete?: boolean
}

export function FolderActions({
	folder,
	onRename,
	onMove,
	onDelete,
	canEdit = false,
	canDelete = false,
}: FolderActionsProps) {
	const handleRename = () => {
		if (onRename) {
			const newName = window.prompt('Enter new name:', folder.name)
			if (newName && newName.trim() && newName !== folder.name) {
				onRename(newName.trim())
			}
		}
	}

	const items: ActionMenuItem[] = []

	// Edit actions
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

		if (onMove) {
			items.push({
				label: 'Move',
				onClick: () => {
					// In a real implementation, this would open a folder picker dialog
					console.log('Move folder not yet implemented')
					// onMove(targetFolderId)
				},
				icon: (
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
						/>
					</svg>
				),
			})
		}
	}

	// Delete action (owners only)
	if (canDelete && onDelete) {
		if (items.length > 0) {
			items.push({ divider: true } as ActionMenuItem)
		}
		items.push({
			label: 'Delete folder',
			onClick: () => {
				if (
					window.confirm(
						`Are you sure you want to delete "${folder.name}" and all its contents? This action cannot be undone.`
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
