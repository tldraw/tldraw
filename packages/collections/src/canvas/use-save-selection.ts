import { useCallback } from 'react'
import { defineMessages, useEditor, useToasts, useTranslation } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionId } from '../lib/schema'
import { saveShapesToCollection } from './save-shapes'
import { activeCollectionId, collectionsPanelOpen } from './state'

const messages = defineMessages({
	saveErrorTitle: {
		id: 'collections.save-error.title',
		defaultMessage: "Couldn't save to collection",
	},
	saveErrorDescription: {
		id: 'collections.save-error.description',
		defaultMessage: 'You may not be allowed to add to this collection, or it no longer exists.',
	},
})

/**
 * Returns a function that saves the current selection to a collection, then shows that collection
 * in the panel. Failures show a toast.
 */
export function useSaveSelection(source: CollectionSource) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()

	return useCallback(
		(collectionId: TLCollectionId) => {
			const shapeIds = editor.getSelectedShapeIds()
			if (shapeIds.length === 0) return
			saveShapesToCollection(editor, source, collectionId, shapeIds).then(
				() => {
					activeCollectionId.set(editor, collectionId)
					collectionsPanelOpen.set(editor, true)
				},
				() => {
					addToast({
						title: msg(messages.saveErrorTitle),
						description: msg(messages.saveErrorDescription),
						severity: 'error',
					})
				}
			)
		},
		[editor, source, msg, addToast]
	)
}
