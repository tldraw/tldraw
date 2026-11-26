import {
	defineMessages,
	TldrawUiDropdownMenuGroup,
	TldrawUiMenuGroup,
	TldrawUiMenuSubmenu,
	useEditor,
	useTranslation,
	useValue,
	type TLLibraryId,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { InContextMenu, MenuItem, MenuTargetItems } from '../ui/menu-items'
import { useLibrariesEnabled } from './license'
import { getLibraryMenuTargets } from './menu-targets'
import { canCreateNewLibrary } from './new-library'
import type { PrepareItemContent } from './save-shapes'
import { useSaveSelectionToLibrary } from './use-save-selection-to-library'

const messages = defineMessages({
	addToLibrary: { id: 'libraries.add-to-library', defaultMessage: 'Add to library' },
	newLibrary: { id: 'libraries.add-to-new-library', defaultMessage: 'New library' },
})

/** @public */
export interface AddToLibraryMenuItemProps {
	source: LibrarySource
	/** Changes an item's content before it's saved, e.g. {@link wrapInGroup}. */
	prepareItemContent?: PrepareItemContent
}

/**
 * An "Add to library" submenu listing the libraries the selection can be added to, in the panel's
 * order, and a new library when the source allows creating one. Hidden when nothing is selected or there is nowhere to add it. Drop it into your
 * context menu, e.g. above `DefaultContextMenuContent`.
 * @public @react
 */
export function AddToLibraryMenuItem({ source, prepareItemContent }: AddToLibraryMenuItemProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const librariesEnabled = useLibrariesEnabled()
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])
	const targets = useValue(
		'add to library targets',
		() =>
			getLibraryMenuTargets(
				source,
				source.getLibraries().filter((library) => source.can('addItem', library.id))
			),
		[source]
	)
	const canCreate = useValue('can create library', () => canCreateNewLibrary(source), [source])
	const { saveSelection, saveToNewLibrary } = useSaveSelectionToLibrary(source, prepareItemContent)

	if (!librariesEnabled || !hasSelection || (targets.length === 0 && !canCreate)) return null

	return (
		<TldrawUiMenuGroup id="libraries">
			<TldrawUiMenuSubmenu id="add-to-library" label={messages.addToLibrary.id}>
				<InContextMenu>
					<TldrawUiDropdownMenuGroup className="tlui-libraries-menu__submenu">
						<MenuTargetItems
							targets={targets}
							onSelect={(libraryId) => saveSelection(libraryId as TLLibraryId)}
						/>
						{canCreate && (
							<>
								{targets.length > 0 && (
									<div role="separator" className="tlui-libraries-menu__divider" />
								)}
								<MenuItem label={msg(messages.newLibrary)} onClick={saveToNewLibrary} />
							</>
						)}
					</TldrawUiDropdownMenuGroup>
				</InContextMenu>
			</TldrawUiMenuSubmenu>
		</TldrawUiMenuGroup>
	)
}
