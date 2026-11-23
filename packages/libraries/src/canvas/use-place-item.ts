import { useCallback, useLayoutEffect, useRef } from 'react'
import {
	defineMessages,
	useEditor,
	useToasts,
	useTranslation,
	useUiEvents,
	type TLLibraryItemId,
	type TLUiEventSource,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { getContentTooNewToast } from './content-too-new-toast'
import { defaultPlaceLibraryItem, type LibraryItemPlacer, placeItemWith } from './place-item'
import { getLibraryErrorReason } from './ui-events'

const messages = defineMessages({
	placeErrorTitle: { id: 'libraries.place-error.title', defaultMessage: "Couldn't place item" },
})

/**
 * Places an item in the middle of the viewport, as clicking its tile does, and reports it as a
 * `place-library-item` event from `eventSource`. A failure is reported and shown in a toast.
 * Always calls the latest `placeItem` passed.
 */
export function usePlaceItem(
	source: LibrarySource,
	placeItem: LibraryItemPlacer = defaultPlaceLibraryItem
): (itemId: TLLibraryItemId, eventSource: TLUiEventSource) => void {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const trackEvent = useUiEvents()
	const latest = useRef({ placeItem, msg, addToast, trackEvent })
	useLayoutEffect(() => {
		latest.current = { placeItem, msg, addToast, trackEvent }
	})

	return useCallback(
		(itemId: TLLibraryItemId, eventSource: TLUiEventSource) => {
			placeItemWith(editor, source, itemId, {}, latest.current.placeItem, 'click').then(
				() =>
					latest.current.trackEvent('place-library-item', { source: eventSource, method: 'click' }),
				(error) => {
					const { msg, addToast, trackEvent } = latest.current
					trackEvent('library-error', {
						source: eventSource,
						action: 'place-library-item',
						reason: getLibraryErrorReason(error),
					})
					addToast(
						getContentTooNewToast(error, msg) ?? {
							title: msg(messages.placeErrorTitle),
							severity: 'error',
						}
					)
				}
			)
		},
		[editor, source]
	)
}
