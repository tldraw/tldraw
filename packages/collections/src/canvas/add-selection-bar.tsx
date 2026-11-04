import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionId } from '../lib/schema'
import type { ReadOnlyOptions } from './collections-panel-header'
import { type SaveSelectionOptions, useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	addToCollection: { id: 'collections.add-to-collection', defaultMessage: 'Add to collection' },
})

/**
 * Where the panel offers adding the selection to the collection showing. `'header'`: a "+" in the
 * header. `'footer'`: a bar along the bottom of the panel.
 * @public
 */
export type AddControl = 'header' | 'footer'

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
	const editor = useEditor()
	const msg = useTranslation()
	const { saveSelection } = useSaveSelection(source, saving)
	const { mayAdd, hasSelection } = useValue(
		'add selection bar',
		() => ({
			mayAdd: source.can('addItem', collectionId),
			hasSelection: editor.getSelectedShapeIds().length > 0,
		}),
		[editor, source, collectionId]
	)

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
