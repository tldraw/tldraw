import { useCallback } from 'react'
import { defineMessages, getIncrementedName, useEditor, useToasts, useTranslation } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import { saveShapesToCollection } from './save-shapes'
import { activeCollectionId, collectionsPanelOpen, renamingCollectionId } from './state'

const messages = defineMessages({
	newCollectionName: { id: 'collections.new-collection-name', defaultMessage: 'New collection' },
	errorTitle: {
		id: 'collections.save-to-new-collection-error.title',
		defaultMessage: "Couldn't add to a new collection",
	},
	errorDescription: {
		id: 'collections.save-to-new-collection-error.description',
		defaultMessage: 'You may not be allowed to create collections, or saving failed.',
	},
})

/**
 * Returns a function that creates a collection named "New collection" (or the next free variant),
 * saves the current selection into it, and opens the panel with the new name ready to edit.
 * Failures show a toast.
 */
export function useSaveToNewCollection(source: CollectionSource) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()

	return useCallback(() => {
		const shapeIds = editor.getSelectedShapeIds()
		if (shapeIds.length === 0) return
		const name = getIncrementedName(
			msg(messages.newCollectionName),
			source.getCollections().map((collection) => collection.name)
		)
		source
			.createCollection(name)
			.then(async (collection) => {
				await saveShapesToCollection(editor, source, collection.id, shapeIds)
				activeCollectionId.set(editor, collection.id)
				collectionsPanelOpen.set(editor, true)
				renamingCollectionId.set(editor, collection.id)
			})
			.catch(() => {
				addToast({
					title: msg(messages.errorTitle),
					description: msg(messages.errorDescription),
					severity: 'error',
				})
			})
	}, [editor, source, msg, addToast])
}
