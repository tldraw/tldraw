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
import { useSaveToNewCollection } from './use-save-to-new-collection'

const messages = defineMessages({
	addToCollection: { id: 'collections.add-to-collection', defaultMessage: 'Add to collection' },
	newCollection: {
		id: 'collections.add-to-new-collection',
		defaultMessage: 'New collection',
	},
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
	const collections = useValue(
		'writable collections',
		() => source.getCollections().filter((collection) => source.can('addItem', collection.id)),
		[source]
	)
	const canCreate = useValue('can create collection', () => source.can('createCollection'), [
		source,
	])
	const saveSelection = useSaveSelection(source)
	const saveToNewCollection = useSaveToNewCollection(source)

	if (!hasSelection || (collections.length === 0 && !canCreate)) return null

	return (
		<TldrawUiMenuGroup id="collections">
			<TldrawUiMenuSubmenu id="add-to-collection" label={messages.addToCollection.id}>
				{collections.length > 0 && (
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
				)}
				{canCreate && (
					<TldrawUiMenuGroup id="add-to-new-collection">
						<TldrawUiMenuItem
							id="add-to-new-collection"
							label={messages.newCollection.id}
							onSelect={saveToNewCollection}
						/>
					</TldrawUiMenuGroup>
				)}
			</TldrawUiMenuSubmenu>
		</TldrawUiMenuGroup>
	)
}
