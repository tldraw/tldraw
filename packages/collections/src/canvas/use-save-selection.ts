import { useCallback } from 'react'
import { defineMessages, useEditor, useToasts, useTranslation } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionId } from '../lib/schema'
import { saveShapesToCollection } from './save-shapes'
import { activeCollectionId, collectionsPanelOpen } from './state'

const messages = defineMessages({
	savedTitle: { id: 'collections.saved.title', defaultMessage: 'Added to collection' },
	savedDescription: { id: 'collections.saved.description', defaultMessage: 'Added to {name}.' },
	savedOpen: { id: 'collections.saved.open', defaultMessage: 'Open' },
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
 * Returns a function that saves the current selection to a collection. With the panel open, the
 * panel shows that collection; otherwise a toast confirms the save and can open it. Failures show
 * a toast.
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
					if (collectionsPanelOpen.get(editor)) {
						activeCollectionId.set(editor, collectionId)
						return
					}
					const collection = source.getCollections().find(({ id }) => id === collectionId)
					addToast({
						title: msg(messages.savedTitle),
						description: collection
							? msg(messages.savedDescription, { name: collection.name })
							: undefined,
						actions: [
							{
								label: msg(messages.savedOpen),
								type: 'primary',
								onClick: () => {
									activeCollectionId.set(editor, collectionId)
									collectionsPanelOpen.set(editor, true)
								},
							},
						],
					})
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
