import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionId } from '../lib/schema'
import { AddTargetsMenuItems } from './add-targets-menu-items'
import type { CollectionGrouping } from './collection-groups'
import type { ReadOnlyOptions } from './collections-panel-header'
import { type AddToCollectionOrder, useAddTargets } from './use-add-targets'
import { type SaveSelectionOptions, useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	addToCollection: { id: 'collections.add-to-collection', defaultMessage: 'Add to collection' },
})

/**
 * Where the panel offers adding the selection, besides the "+" tile that ends each collection's
 * grid. `'none'`: nowhere else. `'footer'`: a bar along the bottom of the panel, which adds to
 * the collection showing, or opens a menu of collections when several are showing. `'header'`: a
 * "+" in the header, and in each section's header.
 * @public
 */
export type AddControl = 'none' | 'header' | 'footer'

function useHasSelection() {
	const editor = useEditor()
	return useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [editor])
}

/** A full-width bar that adds the selection to a collection, disabled until there is one. */
export function AddSelectionBar({
	source,
	collectionId,
	saving,
	readOnly = {},
}: {
	source: CollectionSource
	collectionId: TLCollectionId
	saving?: SaveSelectionOptions
	readOnly?: ReadOnlyOptions
}) {
	const msg = useTranslation()
	const { saveSelection } = useSaveSelection(source, saving)
	const hasSelection = useHasSelection()
	const mayAdd = useValue('may add', () => source.can('addItem', collectionId), [
		source,
		collectionId,
	])

	if (!mayAdd && readOnly.addButton === 'hide') return null

	return (
		<div className="tlui-collections-add-bar">
			<TldrawUiButton
				type="normal"
				className="tlui-collections-add-bar__button"
				disabled={!mayAdd || !hasSelection}
				onClick={() => saveSelection(collectionId)}
			>
				<TldrawUiButtonLabel>{msg(messages.addToCollection)}</TldrawUiButtonLabel>
				<TldrawUiButtonIcon icon="plus" small />
			</TldrawUiButton>
		</div>
	)
}

/**
 * A full-width bar that opens a menu of the collections the selection can be added to, and a new
 * collection when the source allows creating one. Disabled until there is a selection.
 */
export function AddSelectionMenuBar({
	source,
	order,
	groupCollections,
	saving,
	readOnly = {},
}: {
	source: CollectionSource
	order?: AddToCollectionOrder
	groupCollections?: CollectionGrouping
	saving?: SaveSelectionOptions
	readOnly?: ReadOnlyOptions
}) {
	const msg = useTranslation()
	const { saveSelection, saveToNewCollection } = useSaveSelection(source, saving)
	const hasSelection = useHasSelection()
	const targets = useAddTargets(source, order, groupCollections)

	if (!targets.hasTargets && readOnly.addButton === 'hide') return null

	return (
		<div className="tlui-collections-add-bar">
			<TldrawUiDropdownMenuRoot id="collections-add-menu">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton
						type="normal"
						className="tlui-collections-add-bar__button"
						disabled={!targets.hasTargets || !hasSelection}
					>
						<TldrawUiButtonLabel>{msg(messages.addToCollection)}</TldrawUiButtonLabel>
						<TldrawUiButtonIcon icon="plus" small />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent
					className="tlui-collections-menu tlui-collections-add-menu"
					side="bottom"
					align="start"
					sideOffset={4}
					alignOffset={-4}
					collisionPadding={4}
				>
					<TldrawUiDropdownMenuGroup>
						<AddTargetsMenuItems
							targets={targets}
							onAdd={saveSelection}
							onAddToNew={saveToNewCollection}
						/>
					</TldrawUiDropdownMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiDropdownMenuRoot>
		</div>
	)
}
