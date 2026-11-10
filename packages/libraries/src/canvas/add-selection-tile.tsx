import {
	defineMessages,
	TldrawUiIcon,
	useEditor,
	useTranslation,
	useValue,
	type TLLibraryId,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { PrepareItemContent } from './save-shapes'
import { useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	addSelection: { id: 'libraries.add-selection', defaultMessage: 'Add selection' },
	selectToAdd: { id: 'libraries.select-to-add', defaultMessage: 'Select shapes to add them' },
})

export function AddSelectionTile({
	source,
	libraryId,
	prepareItemContent,
}: {
	source: LibrarySource
	libraryId: TLLibraryId
	prepareItemContent?: PrepareItemContent
}) {
	const editor = useEditor()
	const msg = useTranslation()
	const { saveSelection } = useSaveSelection(source, prepareItemContent)
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])

	return (
		<div className="tlui-libraries-tile tlui-libraries-add-tile">
			<button
				type="button"
				className="tlui-libraries-tile__button"
				aria-label={msg(messages.addSelection)}
				title={msg(hasSelection ? messages.addSelection : messages.selectToAdd)}
				disabled={!hasSelection}
				onClick={() => saveSelection(libraryId)}
			>
				<span className="tlui-libraries-tile__thumbnail">
					<TldrawUiIcon icon="plus" label="" small />
				</span>
			</button>
		</div>
	)
}
