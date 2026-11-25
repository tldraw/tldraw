import type { ReactNode } from 'react'
import {
	defineMessages,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useDialogs,
	useEditor,
	useTranslation,
	useUiEvents,
	useValue,
	type TLLibraryId,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { BrowseLibrariesDialog, type LibraryBrowseGroup } from './browse-libraries-dialog'
import { toMenuTargets, useLibraryGrouping } from './library-groups'
import { useLibrariesEnabled } from './license'
import { canCreateNewLibrary } from './new-library'
import type { LibraryItemPlacer } from './place-item'
import { sortByRecentlyAddedTo } from './recent-libraries'
import type { PrepareItemContent } from './save-shapes'
import { librariesPanelOpen, toggleLibrariesPanel } from './state'
import { usePlaceItem } from './use-place-item'
import { useSaveSelectionToLibrary } from './use-save-selection-to-library'

const messages = defineMessages({
	title: { id: 'libraries.title', defaultMessage: 'Libraries' },
	togglePanel: {
		id: 'libraries.command-palette.toggle-panel',
		defaultMessage: 'Toggle libraries panel',
	},
	addToLibrary: { id: 'libraries.add-to-library', defaultMessage: 'Add to library' },
	newLibrary: { id: 'libraries.add-to-new-library', defaultMessage: 'New library' },
	insertFrom: {
		id: 'libraries.command-palette.insert-from',
		defaultMessage: 'Insert from {name}',
	},
	browseMore: { id: 'libraries.browse-more', defaultMessage: 'Browse more libraries' },
})

/** @public */
export interface CommandPaletteLibrariesGroupProps {
	source: LibrarySource
	/** Places an item picked from the results. Defaults to {@link defaultPlaceLibraryItem}. */
	placeItem?: LibraryItemPlacer
	/** Changes an item's content before the selection is saved, e.g. {@link wrapInGroup}. */
	prepareItemContent?: PrepareItemContent
	/** The host's own libraries to browse, as the {@link LibrariesPanel} takes them. */
	getBrowseGroups?(): LibraryBrowseGroup[]
	/** Command palette items of the host's own, listed after the group's commands. */
	children?: ReactNode
}

/**
 * The libraries' commands for tldraw's command palette: open or close the {@link LibrariesPanel},
 * add the selection to a library, as {@link AddToLibraryMenuItem} does, and browse more libraries,
 * as the panel's ⋯ menu does. While the palette has a
 * query, it also lists the best matching items, by their name or their library's, and picking one
 * places it in the middle of the viewport, as clicking its tile does. Renders nothing when
 * libraries aren't enabled. Pass it to `DefaultCommandPalette` with the groups you keep.
 *
 * @example
 * ```tsx
 * const components: TLComponents = {
 * 	CommandPalette: (props) => (
 * 		<DefaultCommandPalette {...props}>
 * 			<CommandPaletteLibrariesGroup source={source} />
 * 			<DefaultCommandPaletteContent />
 * 		</DefaultCommandPalette>
 * 	),
 * }
 * ```
 * @public @react
 */
export function CommandPaletteLibrariesGroup({
	source,
	placeItem,
	prepareItemContent,
	getBrowseGroups,
	children,
}: CommandPaletteLibrariesGroupProps) {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const { addDialog } = useDialogs()
	const librariesEnabled = useLibrariesEnabled()
	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])

	if (!librariesEnabled) return null

	return (
		<TldrawUiMenuGroup id="command-palette-libraries" label={messages.title.id}>
			<TldrawUiMenuItem
				id="toggle-libraries-panel"
				label={messages.togglePanel.id}
				readonlyOk
				onSelect={(eventSource) => {
					trackEvent('toggle-libraries-panel', { source: eventSource, open: !open })
					toggleLibrariesPanel(editor)
				}}
			/>
			<AddSelectionToLibrary source={source} prepareItemContent={prepareItemContent} />
			{(!!(source.getAvailableLibraries && source.addLibraryToDocument) || !!getBrowseGroups) && (
				<TldrawUiMenuItem
					id="browse-libraries"
					label={messages.browseMore.id}
					readonlyOk
					onSelect={(eventSource) => {
						trackEvent('open-browse-libraries', { source: eventSource })
						addDialog({
							component: () => (
								<BrowseLibrariesDialog source={source} getBrowseGroups={getBrowseGroups} />
							),
						})
					}}
				/>
			)}
			{children}
			<InsertFromLibraries source={source} placeItem={placeItem} />
		</TldrawUiMenuGroup>
	)
}

function AddSelectionToLibrary({
	source,
	prepareItemContent,
}: Pick<CommandPaletteLibrariesGroupProps, 'source' | 'prepareItemContent'>) {
	const editor = useEditor()
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
	const { saveSelection, saveToNewLibrary } = useSaveSelectionToLibrary(source, prepareItemContent)

	if (!hasSelection || (libraries.length === 0 && !canCreate)) return null

	return (
		<TldrawUiMenuSubmenu id="add-to-library" label={messages.addToLibrary.id}>
			{toMenuTargets(libraries, grouping).map((target) => (
				<TldrawUiMenuItem
					key={target.id}
					id={`add-to-library:${target.id}`}
					label={target.name}
					detail={target.owner?.name}
					onSelect={() => saveSelection(target.id as TLLibraryId)}
				/>
			))}
			{canCreate && (
				<TldrawUiMenuItem
					id="add-to-new-library"
					label={messages.newLibrary.id}
					onSelect={saveToNewLibrary}
				/>
			)}
		</TldrawUiMenuSubmenu>
	)
}

function InsertFromLibraries({
	source,
	placeItem,
}: Pick<CommandPaletteLibrariesGroupProps, 'source' | 'placeItem'>) {
	const msg = useTranslation()
	const place = usePlaceItem(source, placeItem)
	const libraries = useValue(
		'command palette libraries',
		() =>
			source
				.getLibraries()
				.map((library) => ({
					library,
					items: source.getItems(library.id).filter((item) => !!item.name),
				}))
				.filter(({ items }) => items.length > 0),
		[source]
	)

	return libraries.map(({ library, items }) => (
		<TldrawUiMenuSubmenu
			key={library.id}
			id={`insert-from-library:${library.id}`}
			label={msg(messages.insertFrom, { name: library.name })}
		>
			{items.map((item) => (
				<TldrawUiMenuItem
					key={item.id}
					id={`library-item:${item.id}`}
					label={item.name!}
					detail={library.name}
					onSelect={(eventSource) => place(item.id, eventSource)}
				/>
			))}
		</TldrawUiMenuSubmenu>
	))
}
