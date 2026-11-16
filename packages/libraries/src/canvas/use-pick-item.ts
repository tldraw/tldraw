import { useCallback } from 'react'
import { defineMessages, type TLLibraryItemId, useEditor, useToasts, useTranslation } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { armLibraryItem, hasLibraryStampTool } from './arm-item'
import { placeLibraryItem } from './place-item'

const messages = defineMessages({
	placeErrorTitle: { id: 'libraries.place-error.title', defaultMessage: "Couldn't place item" },
	placeErrorDescription: {
		id: 'libraries.place-error.description',
		defaultMessage: 'It may have been deleted. Try again, or pick another item.',
	},
})

/**
 * What picking an item does: arms it where the host has added the stamp tool, otherwise places a
 * copy in the middle of the viewport. Shows a toast when the item can't be loaded.
 */
export function usePickItem(source: LibrarySource) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	return useCallback(
		(itemId: TLLibraryItemId, thumbnailUrl?: string) => {
			const picked = hasLibraryStampTool(editor)
				? armLibraryItem(editor, source, itemId, { thumbnailUrl })
				: placeLibraryItem(editor, source, itemId)
			picked.catch(() => {
				addToast({
					title: msg(messages.placeErrorTitle),
					description: msg(messages.placeErrorDescription),
					severity: 'error',
				})
			})
		},
		[editor, source, addToast, msg]
	)
}
