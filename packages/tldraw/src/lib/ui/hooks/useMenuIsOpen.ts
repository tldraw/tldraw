import { useGlobalMenuIsOpen, useMaybeEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { TLUiEventMap, useUiEvents } from '../context/events'

/** @public */
export function useMenuIsOpen(id: string, cb?: (isOpen: boolean) => void) {
	const editor = useMaybeEditor()

	const onChange = useCallback(
		(isOpen: boolean) => {
			if (isOpen) {
				editor?.complete()
			}
			cb?.(isOpen)
		},
		[editor, cb]
	)

	const trackEvent = useUiEvents()

	const onEvent = useCallback(
		(eventName: string) => {
			trackEvent(eventName as keyof TLUiEventMap, { source: 'unknown', id })
		},
		[id, trackEvent]
	)

	return useGlobalMenuIsOpen(editor ? `${id}-${editor.contextId}` : id, onChange, onEvent)
}
