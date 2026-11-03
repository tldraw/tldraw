import {
	defineMessages,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useEditor,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import { groupCollectionList, type GroupCollections } from './collection-groups'
import { sortByRecentlySavedTo } from './recent-collections'
import { useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	addToCollection: { id: 'collections.add-to-collection', defaultMessage: 'Add to collection' },
	newCollection: {
		id: 'collections.add-to-new-collection',
		defaultMessage: 'New collection',
	},
})

/**
 * How the submenu orders collections: as the source lists them, or the ones the current user saved
 * to most recently first (remembered in this browser).
 * @public
 */
export type AddToCollectionOrder = 'source' | 'recent'

/** @public */
export interface AddToCollectionMenuItemProps {
	source: CollectionSource
	/** Defaults to `'source'`. */
	order?: AddToCollectionOrder
	/** Groups the collections, each group headed by its name, e.g. by scope. */
	groupCollections?: GroupCollections
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
	groupCollections,
}: AddToCollectionMenuItemProps) {
	const editor = useEditor()
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])
	const collections = useValue(
		'writable collections',
		() => {
			const writable = source
				.getCollections()
				.filter((collection) => source.can('addItem', collection.id))
			return order === 'recent' ? sortByRecentlySavedTo(source.id, writable) : writable
		},
		[source, order]
	)
	const canCreate = useValue('can create collection', () => source.can('createCollection'), [
		source,
	])
	const { saveSelection, saveToNewCollection } = useSaveSelection(source)

	if (!hasSelection || (collections.length === 0 && !canCreate)) return null

	return (
		<TldrawUiMenuGroup id="collections">
			<TldrawUiMenuSubmenu id="add-to-collection" label={messages.addToCollection.id}>
				{groupCollectionList(collections, groupCollections).map((group, index) => (
					<TldrawUiMenuGroup key={group.label ?? index} id={`add-to-collection-targets-${index}`}>
						{/* Menu groups can't show a heading, and context menus hide disabled items, so a plain
						    element is the heading; keyboard navigation passes over it. */}
						{group.label && (
							<div className="tlui-collections-menu-heading" role="presentation">
								{group.label}
							</div>
						)}
						{group.collections.map((collection) => (
							<TldrawUiMenuItem
								key={collection.id}
								id={`add-to-collection-${collection.id}`}
								label={collection.name}
								onSelect={() => saveSelection(collection.id)}
							/>
						))}
					</TldrawUiMenuGroup>
				))}
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
