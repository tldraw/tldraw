import { defineMessages, TldrawUiMenuGroup, TldrawUiMenuSubmenu, useEditor, useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import { AddTargetsMenuItems } from './add-targets-menu-items'
import { useAddTargets } from './use-add-targets'
import { useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	addToCollection: { id: 'collections.add-to-collection', defaultMessage: 'Add to collection' },
})

/** @public */
export interface AddToCollectionMenuItemProps {
	source: CollectionSource
}

/**
 * An "Add to collection" submenu listing the collections the selection can be added to, and a new
 * collection when the source allows creating one. Hidden when nothing is selected or there is
 * nowhere to add it. Drop it into your context menu, e.g. above `DefaultContextMenuContent`.
 * @public @react
 */
export function AddToCollectionMenuItem({ source }: AddToCollectionMenuItemProps) {
	const editor = useEditor()
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])
	const targets = useAddTargets(source)
	const { saveSelection, saveToNewCollection } = useSaveSelection(source)

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
