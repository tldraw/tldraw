import {
	defineMessages,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useEditor,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { CollectionGrouping } from './collection-groups'
import { type AddToCollectionOrder, useAddTargets } from './use-add-targets'
import { type SaveSelectionOptions, useSaveSelection } from './use-save-selection'

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
	/** Defaults to `'source'`. */
	order?: AddToCollectionOrder
	/** Groups the collections, each group headed by its name, e.g. by owner. */
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
	groupCollections,
	saving,
}: AddToCollectionMenuItemProps) {
	const editor = useEditor()
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])
	const { groups, canCreate, hasTargets } = useAddTargets(source, order, groupCollections)
	const { saveSelection, saveToNewCollection } = useSaveSelection(source, saving)

	if (!hasSelection || !hasTargets) return null

	return (
		<TldrawUiMenuGroup id="collections">
			<TldrawUiMenuSubmenu id="add-to-collection" label={messages.addToCollection.id}>
				{groups.map((group, index) => (
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
