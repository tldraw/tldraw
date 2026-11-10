import {
	defineMessages,
	TldrawUiDropdownMenuGroup,
	TldrawUiMenuGroup,
	TldrawUiMenuSubmenu,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import { InContextMenu, MenuItem } from '../ui/menu-items'
import { sortByRecentlyAddedTo } from './recent-collections'
import { useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	addToCollection: { id: 'collections.add-to-collection', defaultMessage: 'Add to collection' },
	newCollection: { id: 'collections.add-to-new-collection', defaultMessage: 'New collection' },
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
	const msg = useTranslation()
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])
	const collections = useValue(
		'writable collections',
		() =>
			sortByRecentlyAddedTo(
				source.id,
				source.getCollections().filter((collection) => source.can('addItem', collection.id))
			),
		[source]
	)
	const canCreate = useValue('can create collection', () => source.can('createCollection'), [
		source,
	])
	const { saveSelection, saveToNewCollection } = useSaveSelection(source)

	if (!hasSelection || (collections.length === 0 && !canCreate)) return null

	return (
		<TldrawUiMenuGroup id="collections">
			<TldrawUiMenuSubmenu id="add-to-collection" label={messages.addToCollection.id}>
				<InContextMenu>
					<TldrawUiDropdownMenuGroup className="tlui-collections-menu__submenu">
						{collections.map((collection) => (
							<MenuItem
								key={collection.id}
								label={collection.name}
								onClick={() => saveSelection(collection.id)}
							/>
						))}
						{canCreate && (
							<>
								{collections.length > 0 && (
									<div role="separator" className="tlui-collections-menu__divider" />
								)}
								<MenuItem label={msg(messages.newCollection)} onClick={saveToNewCollection} />
							</>
						)}
					</TldrawUiDropdownMenuGroup>
				</InContextMenu>
			</TldrawUiMenuSubmenu>
		</TldrawUiMenuGroup>
	)
}
