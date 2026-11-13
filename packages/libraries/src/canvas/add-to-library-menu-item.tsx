import {
	defineMessages,
	TldrawUiDropdownMenuGroup,
	TldrawUiMenuGroup,
	TldrawUiMenuSubmenu,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { InContextMenu, MenuItem } from '../ui/menu-items'
import { groupLibraryList, useLibraryGrouping } from './library-groups'
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
 * An "Add to library" submenu listing the libraries the selection can be added to, under
 * their owners' names when the source has two or more, and a new library when the source allows
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
	const grouping = useLibraryGrouping(source)
	const canCreate = useValue('can create library', () => canCreateNewLibrary(source), [source])
	const { saveSelection, saveToNewLibrary } = useSaveSelection(source, prepareItemContent)

	if (!librariesEnabled || !hasSelection || (libraries.length === 0 && !canCreate)) return null

	return (
		<TldrawUiMenuGroup id="libraries">
			<TldrawUiMenuSubmenu id="add-to-library" label={messages.addToLibrary.id}>
				<InContextMenu>
					<TldrawUiDropdownMenuGroup className="tlui-libraries-menu__submenu">
						{groupLibraryList(libraries, grouping).map((group) => (
							<div key={group.key ?? ''} role="group" aria-label={group.label}>
								{group.label && (
									<div className="tlui-libraries-menu-heading" role="presentation">
										{group.label}
									</div>
								)}
								{group.libraries.map((library) => (
									<MenuItem
										key={library.id}
										label={library.name}
										onClick={() => saveSelection(library.id)}
									/>
								))}
							</div>
						))}
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
