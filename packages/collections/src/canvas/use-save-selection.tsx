import { useCallback } from 'react'
import {
	defineMessages,
	getIncrementedName,
	useEditor,
	useToasts,
	useTranslation,
	type Editor,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionId } from '../lib/schema'
import { createNewCollection } from './new-collection'
import { saveShapesToCollection } from './save-shapes'
import { activeCollectionId, collectionsPanelOpen, renamingCollectionId } from './state'

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
	newCollectionName: { id: 'collections.new-collection-name', defaultMessage: 'New collection' },
	newCollectionErrorTitle: {
		id: 'collections.save-to-new-collection-error.title',
		defaultMessage: "Couldn't add to a new collection",
	},
	newCollectionErrorDescription: {
		id: 'collections.save-to-new-collection-error.description',
		defaultMessage: 'You may not be allowed to create collections, or saving failed.',
	},
})

function showCollection(editor: Editor, collectionId: TLCollectionId) {
	activeCollectionId.set(editor, collectionId)
	collectionsPanelOpen.set(editor, true)
}

/**
 * Returns functions that save the current selection, unnamed. `saveSelection` saves to an existing
 * collection: with the panel open, the panel brings that collection into view; otherwise a toast
 * confirms the save and can open it. `saveToNewCollection` creates a collection named "New
 * collection" (or the next free variant), saves into it, and opens the panel with the new name
 * ready to edit. Failures show a toast.
 */
export function useSaveSelection(source: CollectionSource) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()

	const saveSelection = useCallback(
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
								onClick: () => showCollection(editor, collectionId),
							},
						],
					})
				},
				() =>
					addToast({
						title: msg(messages.saveErrorTitle),
						description: msg(messages.saveErrorDescription),
						severity: 'error',
					})
			)
		},
		[editor, source, msg, addToast]
	)

	const saveToNewCollection = useCallback(() => {
		const shapeIds = editor.getSelectedShapeIds()
		if (shapeIds.length === 0) return
		const name = getIncrementedName(
			msg(messages.newCollectionName),
			source.getCollections().map((collection) => collection.name)
		)
		createNewCollection(source, name)
			.then(async (collection) => {
				await saveShapesToCollection(editor, source, collection.id, shapeIds)
				showCollection(editor, collection.id)
				renamingCollectionId.set(editor, collection.id)
			})
			.catch(() => {
				addToast({
					title: msg(messages.newCollectionErrorTitle),
					description: msg(messages.newCollectionErrorDescription),
					severity: 'error',
				})
			})
	}, [editor, source, msg, addToast])

	return { saveSelection, saveToNewCollection }
}
