'use client'

// useDocumentRealtimeUpdates Hook
// Subscribes to real-time updates for a specific document
// Used by both workspace members and guests to receive permission changes

import { CHANNEL_PATTERNS, type DocumentEventType, type RealtimeEvent } from '@/lib/realtime/types'
import { getBrowserClient } from '@/lib/supabase/browser'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef } from 'react'

interface UseDocumentRealtimeUpdatesOptions {
	onSharingUpdate?: (event: RealtimeEvent) => void
	onPermissionsChange?: (event: RealtimeEvent) => void
	onMetadataUpdate?: (event: RealtimeEvent) => void
	onReconnect?: () => void
	onError?: (error: Error) => void
	enabled?: boolean
}

/**
 * Hook to subscribe to real-time updates for a specific document
 *
 * This hook enables document-level subscriptions so that guests (unauthenticated
 * or non-workspace-member users) can receive updates when document permissions
 * change, without needing access to workspace-level channels.
 *
 * @param documentId - The document ID to subscribe to
 * @param options - Event handlers and configuration
 * @returns Object with subscription status and manual refresh function
 */
export function useDocumentRealtimeUpdates(
	documentId: string | null | undefined,
	options: UseDocumentRealtimeUpdatesOptions = {}
) {
	const {
		onSharingUpdate,
		onPermissionsChange,
		onMetadataUpdate,
		onReconnect,
		onError,
		enabled = true,
	} = options

	const channelRef = useRef<RealtimeChannel | null>(null)
	const supabase = getBrowserClient()

	// Handle incoming events
	const handleEvent = useCallback(
		(payload: any) => {
			try {
				const event = payload as RealtimeEvent

				// Route event to appropriate handler based on type
				const eventType = event.type as DocumentEventType

				if (eventType === 'document.sharing_updated') {
					onSharingUpdate?.(event)
				} else if (eventType === 'document.permissions_changed') {
					onPermissionsChange?.(event)
				} else if (eventType === 'document.metadata_updated') {
					onMetadataUpdate?.(event)
				}
			} catch (error) {
				console.error('Error handling document realtime event:', error)
				onError?.(error as Error)
			}
		},
		[onSharingUpdate, onPermissionsChange, onMetadataUpdate, onError]
	)

	// Manual refresh function (useful after reconnection)
	const refresh = useCallback(() => {
		onReconnect?.()
	}, [onReconnect])

	useEffect(() => {
		// Skip if no document ID or disabled
		if (!documentId || !enabled) {
			return
		}

		// Create channel and subscribe
		const channel = supabase
			.channel(CHANNEL_PATTERNS.document(documentId))
			.on('broadcast', { event: 'document_event' }, handleEvent)
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					console.log(`Subscribed to document ${documentId} realtime updates`)
				} else if (status === 'CHANNEL_ERROR') {
					console.error(`Failed to subscribe to document ${documentId}`)
					onError?.(new Error('Failed to subscribe to document updates'))
				} else if (status === 'CLOSED') {
					console.log(`Channel closed for document ${documentId}`)
				}
			})

		// Store channel reference
		channelRef.current = channel

		// Handle reconnection
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible' && channelRef.current) {
				// When tab becomes visible, trigger reconnect callback
				// This allows the UI to refetch data to catch up on missed events
				refresh()
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		// Cleanup on unmount
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)

			if (channelRef.current) {
				supabase.removeChannel(channelRef.current)
				channelRef.current = null
			}
		}
	}, [documentId, enabled, handleEvent, refresh, onError, supabase])

	return {
		isSubscribed: !!channelRef.current,
		refresh,
	}
}
