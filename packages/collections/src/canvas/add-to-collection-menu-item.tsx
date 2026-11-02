import {
	defineMessages,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useEditor,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import { useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	addToCollection: { id: 'collections.add-to-collection', defaultMessage: 'Add to collection' },
})

/** @public */
export interface AddToCollectionMenuItemProps {
	source: CollectionSource
}

/**
 * An "Add to collection" submenu listing the collections the selection can be added to. Hidden
 * when nothing is selected or no collection accepts items. Drop it into your context menu, e.g.
 * above `DefaultContextMenuContent`.
 * @public @react
 */
export function AddToCollectionMenuItem({ source }: AddToCollectionMenuItemProps) {
	const editor = useEditor()
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])
	const collections = useValue(
		'writable collections',
		() => source.getCollections().filter((collection) => source.can('addItem', collection.id)),
		[source]
	)
	const saveSelection = useSaveSelection(source)

	if (!hasSelection || collections.length === 0) return null

	return (
		<TldrawUiMenuGroup id="collections">
			<TldrawUiMenuSubmenu id="add-to-collection" label={messages.addToCollection.id}>
				<TldrawUiMenuGroup id="add-to-collection-targets">
					{collections.map((collection) => (
						<TldrawUiMenuItem
							key={collection.id}
							id={`add-to-collection-${collection.id}`}
							label={collection.name}
							onSelect={() => saveSelection(collection.id)}
						/>
					))}
				</TldrawUiMenuGroup>
			</TldrawUiMenuSubmenu>
		</TldrawUiMenuGroup>
	)
}
