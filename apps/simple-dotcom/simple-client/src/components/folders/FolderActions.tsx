'use client'

// FolderActions Component
// Dropdown menu with folder-specific actions

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PromptDialog } from '@/components/ui/prompt-dialog'
import type { Folder } from '@/lib/api/types'
import { useState } from 'react'
import { ActionMenu, type ActionMenuItem } from '../shared/ActionMenu'
import { FolderPicker } from './FolderPicker'

interface FolderActionsProps {
	folder: {
		id: string
		name: string
		parent_folder_id?: string | null
	}
	allFolders?: Folder[]
	onRename?: (newName: string) => void
	onMove?: (targetFolderId: string | null) => void
	onDelete?: () => void
	canEdit?: boolean
	canDelete?: boolean
}

export function FolderActions({
	folder,
	allFolders = [],
	onRename,
	onMove,
	onDelete,
	canEdit = false,
	canDelete = false,
}: FolderActionsProps) {
	const [showFolderPicker, setShowFolderPicker] = useState(false)
	const [showRenameDialog, setShowRenameDialog] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)

	const handleRename = () => {
		setShowRenameDialog(true)
	}

	const handleConfirmRename = (newName: string) => {
		if (onRename && newName !== folder.name) {
			onRename(newName)
		}
		setShowRenameDialog(false)
	}

	const handleConfirmDelete = () => {
		if (onDelete) {
			onDelete()
		}
		setShowDeleteDialog(false)
	}

	const handleMove = (targetFolderId: string | null) => {
		if (onMove) {
			onMove(targetFolderId)
			setShowFolderPicker(false)
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
					setShowFolderPicker(true)
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
			onClick: () => setShowDeleteDialog(true),
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

	return (
		<>
			<ActionMenu items={items} ariaLabel="Folder actions" tooltipText="Folder actions" />
			{showFolderPicker && onMove && (
				<FolderPicker
					folders={allFolders}
					currentFolderId={folder.id}
					currentParentId={folder.parent_folder_id}
					onSelect={handleMove}
					onCancel={() => setShowFolderPicker(false)}
					isOpen={showFolderPicker}
				/>
			)}
			<PromptDialog
				open={showRenameDialog}
				onOpenChange={setShowRenameDialog}
				title="Rename Folder"
				label="Folder Name"
				defaultValue={folder.name}
				placeholder="Enter folder name"
				onConfirm={handleConfirmRename}
				confirmText="Rename"
			/>
			<ConfirmDialog
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}
				title="Delete Folder"
				description={`Are you sure you want to delete "${folder.name}" and all its contents? This action cannot be undone.`}
				onConfirm={handleConfirmDelete}
				confirmText="Delete"
				destructive
			/>
		</>
	)
}
