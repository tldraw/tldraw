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
import { AddTargetsMenuItems } from './add-targets-menu-items'
import { useAddTargets } from './use-add-targets'
import { useSaveSelection } from './use-save-selection'

const messages = defineMessages({
	addToCollection: { id: 'collections.add-to-collection', defaultMessage: 'Add to collection' },
})

/**
 * A full-width bar along the bottom of the panel that opens a menu of the collections the selection
 * can be added to, and a new collection when the source allows creating one. Disabled until there
 * is a selection and somewhere to add it.
 */
export function AddSelectionBar({ source }: { source: CollectionSource }) {
	const editor = useEditor()
	const msg = useTranslation()
	const { saveSelection, saveToNewCollection } = useSaveSelection(source)
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])
	const targets = useAddTargets(source)

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
