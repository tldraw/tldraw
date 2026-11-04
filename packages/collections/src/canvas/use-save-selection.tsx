import { useCallback } from 'react'
import {
	defineMessages,
	getIncrementedName,
	useEditor,
	useToasts,
	useTranslation,
	useDialogs,
	type Editor,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionId, TLCollectionItem } from '../lib/schema'
import { NameItemDialog } from './name-item-dialog'
import { createNewCollection } from './new-collection'
import { recordRecentCollection } from './recent-collections'
import { saveShapesToCollection } from './save-shapes'
import {
	activeCollectionId,
	collectionsPanelOpen,
	highlightedItemId,
	renamingCollectionId,
	renamingItemId,
} from './state'

const messages = defineMessages({
	savedTitle: { id: 'collections.saved.title', defaultMessage: 'Added to collection' },
	savedDescription: { id: 'collections.saved.description', defaultMessage: 'Added to {name}.' },
	savedOpen: { id: 'collections.saved.open', defaultMessage: 'Open' },
	savedUndo: { id: 'collections.saved.undo', defaultMessage: 'Undo' },
	automaticName: { id: 'collections.automatic-item-name', defaultMessage: 'Drawing' },
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
 * What happens around a save. Every field is optional; the defaults are an unnamed item, a toast
 * when the panel is closed, and no undo.
 * @public
 */
export interface SaveSelectionOptions {
	/**
	 * `'none'`: unnamed. `'auto'`: "Drawing", "Drawing 2"… `'dialog'`: ask before saving; cancelling
	 * saves nothing. `'inline'`: save, then open the new item's menu with its name ready to edit.
	 */
	naming?: 'none' | 'auto' | 'dialog' | 'inline'
	/**
	 * `'toast'`: with the panel open, show the collection; otherwise a toast that can open it.
	 * `'panel'`: always open the panel on the collection. `'highlight'`: open it, scroll to the new
	 * item and flash it.
	 */
	confirmation?: 'toast' | 'panel' | 'highlight'
	/** `'toast'` adds an Undo to the confirming toast, which deletes the item again. */
	undo?: 'none' | 'toast'
}

/**
 * Returns functions that save the current selection. `saveSelection` saves to an existing
 * collection: with the panel open, the panel shows that collection; otherwise a toast confirms the
 * save and can open it. `saveToNewCollection` creates a collection named "New collection" (or the
 * next free variant), saves into it, and opens the panel with the new name ready to edit. Failures
 * show a toast.
 */
export function useSaveSelection(source: CollectionSource, options: SaveSelectionOptions = {}) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const { naming = 'none', confirmation = 'toast', undo = 'none' } = options

	const confirm = useCallback(
		(collectionId: TLCollectionId, item: TLCollectionItem) => {
			recordRecentCollection(source.id, collectionId)
			const panelWasOpen = collectionsPanelOpen.get(editor)
			if (naming === 'inline') {
				showCollection(editor, collectionId)
				renamingItemId.set(editor, item.id)
			} else if (confirmation === 'toast' && panelWasOpen) {
				activeCollectionId.set(editor, collectionId)
			} else if (confirmation !== 'toast') {
				showCollection(editor, collectionId)
				if (confirmation === 'highlight') highlightedItemId.set(editor, item.id)
			}
			// A toast when nothing else showed the save, and whenever it carries an Undo.
			const toastShowsSave = confirmation === 'toast' && !panelWasOpen && naming !== 'inline'
			if (!toastShowsSave && undo !== 'toast') return
			const collection = source.getCollections().find(({ id }) => id === collectionId)
			addToast({
				title: msg(messages.savedTitle),
				description: collection
					? msg(messages.savedDescription, { name: collection.name })
					: undefined,
				actions: [
					...(toastShowsSave
						? [
								{
									label: msg(messages.savedOpen),
									type: 'primary' as const,
									onClick: () => showCollection(editor, collectionId),
								},
							]
						: []),
					...(undo === 'toast'
						? [
								{
									label: msg(messages.savedUndo),
									type: 'normal' as const,
									onClick: () => source.deleteItem(item.id).catch(() => {}),
								},
							]
						: []),
				],
			})
		},
		[editor, source, msg, addToast, naming, confirmation, undo]
	)

	const showSaveError = useCallback(
		() =>
			addToast({
				title: msg(messages.saveErrorTitle),
				description: msg(messages.saveErrorDescription),
				severity: 'error',
			}),
		[addToast, msg]
	)

	const saveSelection = useCallback(
		(collectionId: TLCollectionId) => {
			const shapeIds = editor.getSelectedShapeIds()
			if (shapeIds.length === 0) return
			const save = (name?: string) =>
				saveShapesToCollection(editor, source, collectionId, shapeIds, name).then(
					(item) => confirm(collectionId, item),
					showSaveError
				)
			if (naming === 'dialog') {
				addDialog({
					component: ({ onClose }) => <NameItemDialog onClose={onClose} onSave={save} />,
				})
			} else if (naming === 'auto') {
				// Numbered from 1: the first number not already taken.
				const names = new Set(source.getItems(collectionId).map((item) => item.name))
				const base = msg(messages.automaticName)
				let n = 1
				while (names.has(`${base} ${n}`)) n++
				save(`${base} ${n}`)
			} else {
				save()
			}
		},
		[editor, source, msg, addDialog, naming, confirm, showSaveError]
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
				recordRecentCollection(source.id, collection.id)
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
