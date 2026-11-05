import { defineMessages, TldrawUiMenuGroup, TldrawUiMenuSubmenu, useEditor, useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import { AddTargetsMenuItems } from './add-targets-menu-items'
import type { CollectionGrouping } from './collection-groups'
import { type AddToCollectionOrder, useAddTargets } from './use-add-targets'
import { type SaveSelectionOptions, useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	addToCollection: { id: 'collections.add-to-collection', defaultMessage: 'Add to collection' },
})

/** @public */
export interface AddToCollectionMenuItemProps {
	source: CollectionSource
	/** Defaults to `'source'`. */
	order?: AddToCollectionOrder
	/** Groups the collections, each group headed by its name. Defaults to `'owner'`. */
	groupCollections?: CollectionGrouping
	/** What happens around a save: naming, confirmation and undo. */
	saving?: SaveSelectionOptions
}

/**
 * An "Add to collection" submenu listing the collections the selection can be added to, and a new
 * collection when the source allows creating one. Hidden when nothing is selected or there is
 * nowhere to add it. Drop it into your context menu, e.g. above `DefaultContextMenuContent`.
 * @public @react
 */
export function AddToCollectionMenuItem({
	source,
	order = 'source',
	groupCollections = 'owner',
	saving,
}: AddToCollectionMenuItemProps) {
	const editor = useEditor()
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])
	const targets = useAddTargets(source, order, groupCollections)
	const { saveSelection, saveToNewCollection } = useSaveSelection(source, saving)

	if (!hasSelection || !targets.hasTargets) return null

	return (
		<TldrawUiMenuGroup id="collections">
			<TldrawUiMenuSubmenu id="add-to-collection" label={messages.addToCollection.id}>
				<AddTargetsMenuItems
					targets={targets}
					onAdd={saveSelection}
					onAddToNew={saveToNewCollection}
				/>
			</TldrawUiMenuSubmenu>
		</TldrawUiMenuGroup>
	)
}
