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
import { getLibraryPath } from '../lib/libraryTree'
import { InContextMenu, MenuItem, MenuTargetItems } from '../ui/menu-items'
import { toMenuTargets, useLibraryGrouping } from './library-groups'
import { useLibrariesEnabled } from './license'
import { canCreateNewLibrary } from './new-library'
import { sortByRecentlyAddedTo } from './recent-libraries'
import type { PrepareItemContent } from './save-shapes'
import { useSaveSelection } from './use-save-selection'

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
 * An "Add to library" submenu listing the libraries the selection can be added to, most recently
 * added to first, each named with the libraries it is inside, under their owners' names when the
 * source has two or more, and a new library when the source allows
 * creating one. Hidden when nothing is selected or there is nowhere to add it. Drop it into your
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
	const libraries = useValue(
		'writable libraries',
		() =>
			sortByRecentlyAddedTo(
				source.id,
				source.getLibraries().filter((library) => source.can('addItem', library.id))
			),
		[source]
	)
	const allLibraries = useValue('libraries', () => source.getLibraries(), [source])
	const grouping = useLibraryGrouping(source)
	const canCreate = useValue('can create library', () => canCreateNewLibrary(source), [source])
	const { saveSelection, saveToNewLibrary } = useSaveSelection(source, prepareItemContent)

	if (!librariesEnabled || !hasSelection || (libraries.length === 0 && !canCreate)) return null

	return (
		<TldrawUiMenuGroup id="libraries">
			<TldrawUiMenuSubmenu id="add-to-library" label={messages.addToLibrary.id}>
				<InContextMenu>
					<TldrawUiDropdownMenuGroup className="tlui-libraries-menu__submenu">
						<MenuTargetItems
							targets={toMenuTargets(libraries, grouping).map((target) => ({
								...target,
								name: getLibraryPath(allLibraries, target.id)
									.map((c) => c.name)
									.join(' › '),
							}))}
							onSelect={(libraryId) => saveSelection(libraryId as TLLibraryId)}
						/>
						{canCreate && (
							<>
								{libraries.length > 0 && (
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
