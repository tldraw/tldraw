import { defineMessages, TldrawUiIcon, useEditor, useTranslation, useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionId } from '../lib/schema'
import type { PrepareItemContent } from './save-shapes'
import { useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	addSelection: { id: 'collections.add-selection', defaultMessage: 'Add selection' },
	selectToAdd: { id: 'collections.select-to-add', defaultMessage: 'Select shapes to add them' },
})

export function AddSelectionTile({
	source,
	collectionId,
	prepareItemContent,
}: {
	source: CollectionSource
	collectionId: TLCollectionId
	prepareItemContent?: PrepareItemContent
}) {
	const editor = useEditor()
	const msg = useTranslation()
	const { saveSelection } = useSaveSelection(source, prepareItemContent)
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])

	return (
		<div className="tlui-collections-tile tlui-collections-add-tile">
			<button
				type="button"
				className="tlui-collections-tile__button"
				aria-label={msg(messages.addSelection)}
				title={msg(hasSelection ? messages.addSelection : messages.selectToAdd)}
				disabled={!hasSelection}
				onClick={() => saveSelection(collectionId)}
			>
				<span className="tlui-collections-tile__thumbnail">
					<TldrawUiIcon icon="plus" label="" small />
				</span>
			</button>
		</div>
	)
}
