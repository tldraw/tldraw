'use client'

// useDocumentActions Hook
// Shared document operation handlers for rename, duplicate, archive, restore, delete

import { useCallback } from 'react'
import { toast } from 'sonner'

interface UseDocumentActionsOptions {
	onInvalidate?: () => void
}

/**
 * Hook providing document action handlers that can be reused across components
 *
 * Handles:
 * - Rename
 * - Duplicate
 * - Archive
 * - Restore
 * - Delete (permanent)
 *
 * All mutations trigger onInvalidate callback (typically React Query invalidation)
 * Realtime subscriptions handle automatic UI updates
 */
export function useDocumentActions(options: UseDocumentActionsOptions = {}) {
	const { onInvalidate } = options

	const handleDocumentRename = useCallback(
		async (documentId: string, newName: string) => {
			try {
				const response = await fetch(`/api/documents/${documentId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: newName }),
				})

				const data = await response.json()

				if (data.success) {
					onInvalidate?.()
					toast.success('Document renamed successfully')
				} else {
					toast.error(data.error?.message || 'Failed to rename document')
				}
			} catch (err) {
				console.error('Failed to rename document:', err)
				toast.error('Failed to rename document')
			}
		},
		[onInvalidate]
	)

	const handleDocumentDuplicate = useCallback(async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}/duplicate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			})

			const data = await response.json()

			if (!data.success) {
				toast.error(data.error?.message || 'Failed to duplicate document')
			} else {
				toast.success('Document duplicated successfully')
			}
			// Realtime subscription will handle adding the new document
		} catch (err) {
			console.error('Failed to duplicate document:', err)
			toast.error('Failed to duplicate document')
		}
	}, [])

	const handleDocumentArchive = useCallback(async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_archived: true }),
			})

			const data = await response.json()

			if (!data.success) {
				toast.error(data.error?.message || 'Failed to archive document')
			} else {
				toast.success('Document archived successfully')
			}
			// Realtime subscription will handle the update
		} catch (err) {
			console.error('Failed to archive document:', err)
			toast.error('Failed to archive document')
		}
	}, [])

	const handleDocumentRestore = useCallback(async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_archived: false }),
			})

			const data = await response.json()

			if (!data.success) {
				toast.error(data.error?.message || 'Failed to restore document')
			} else {
				toast.success('Document restored successfully')
			}
			// Realtime subscription will handle the update
		} catch (err) {
			console.error('Failed to restore document:', err)
			toast.error('Failed to restore document')
		}
	}, [])

	const handleDocumentDelete = useCallback(async (documentId: string) => {
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'DELETE',
			})

			const data = await response.json()

			if (!data.success) {
				toast.error(data.error?.message || 'Failed to delete document')
			} else {
				toast.success('Document deleted successfully')
			}
			// Realtime subscription will handle the deletion
		} catch (err) {
			console.error('Failed to delete document:', err)
			toast.error('Failed to delete document')
		}
	}, [])

	return {
		handleDocumentRename,
		handleDocumentDuplicate,
		handleDocumentArchive,
		handleDocumentRestore,
		handleDocumentDelete,
	}
}
