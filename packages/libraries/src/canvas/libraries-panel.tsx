import type { ReactNode } from 'react'
import {
	defineMessages,
	EditorPortal,
	useDialogs,
	useEditor,
	useTranslation,
	useUiEvents,
	useValue,
	type TLLibrary,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { AddMoreMenu } from './add-more-menu'
import { BrowseLibrariesDialog, type LibraryBrowseGroup } from './browse-libraries-dialog'
import { EmptyThisFile } from './empty-this-file'
import {
	type LibrariesComponents,
	LibrariesComponentsProvider,
	useLibrariesComponentOverrides,
} from './libraries-components'
import { LibrariesPanelHeader as DefaultLibrariesPanelHeader } from './libraries-panel-header'
import { LibrariesSearch } from './libraries-search'
import { LibrarySection } from './library-section'
import { useLibrariesEnabled } from './license'
import { canCreateNewLibrary, getNewLibraryOwners } from './new-library'
import { NoLibraries as DefaultNoLibraries } from './no-libraries'
import { getSearchScope, normalizeQuery } from './panel-search'
import { getEmptyThisFileOffers, getPanelSections } from './panel-sections'
import type { LibraryItemPlacer } from './place-item'
import type { PrepareItemContent } from './save-shapes'
import { SearchResults } from './search-results'
import {
	librariesPanelOpen,
	librariesSearchQuery,
	librariesSearchScope,
	renamingLibraryId,
} from './state'
import { useCreateLibrary } from './use-create-library'
import { useLibraryItemDrag, usePlaceLibraryItem } from './use-item-drag'
import { useLibraries } from './use-libraries'

const messages = defineMessages({
	title: { id: 'libraries.title', defaultMessage: 'Libraries' },
	thisFile: { id: 'libraries.panel.this-file', defaultMessage: 'This file' },
	search: { id: 'libraries.search.placeholder', defaultMessage: 'Search libraries' },
})

/** @public */
export interface LibrariesPanelProps {
	source: LibrarySource
	/** Which side of the canvas the panel floats on. Defaults to `'left'`. */
	side?: 'left' | 'right'
	/**
	 * Items of the host's own for the panel's ⋯ menu, e.g. {@link LibraryMenuItem}s. Shown in a
	 * read-only editor too.
	 */
	menuItems?: ReactNode
	/** Changes an item's content before the panel's + saves it, e.g. {@link wrapInGroup}. */
	prepareItemContent?: PrepareItemContent
	/** Replaces or hides pieces of the panel. See {@link LibrariesComponents}. */
	components?: LibrariesComponents
	/**
	 * Places an item when it's clicked or dragged out, e.g. without selecting it. Defaults to
	 * {@link defaultPlaceLibraryItem}.
	 */
	placeItem?: LibraryItemPlacer
	/**
	 * Groups of the host's own for the "Browse libraries" dialog, after the libraries the source
	 * has available to add, such as libraries the app ships as data. Called reactively, so it can
	 * read signals. With it, "Browse libraries" is offered even by a source that doesn't add
	 * libraries to documents.
	 */
	getBrowseGroups?(): LibraryBrowseGroup[]
}

/**
 * A floating panel on one side of the canvas for browsing a {@link LibrarySource}, shown while
 * {@link librariesPanelOpen} is set. Each library is a section that folds shut. A source that
 * says why its libraries are shown (see {@link LibrarySource.getLibraryPlacement}) lists those in
 * the document under "This file", then the user's default; any other source lists its libraries
 * as they come. Setting {@link activeLibraryId} brings that library into view. Clicking an item
 * places a copy of it in the middle of the viewport; dragging one out drops it under the pointer.
 *
 * A drag starts once the pointer has left the panel and moved past the editor's
 * `uiDragDistanceSquared` option (`uiCoarseDragDistanceSquared` for touch and pen), as dragging a
 * tool out of the toolbar does. Set them with `<Tldraw options={{ … }}>`.
 *
 * Its size and position follow CSS variables set on the panel or any element around it:
 *
 * - `--tlui-libraries-panel-inset-top`: the gap above the panel. Defaults to `48px`, below the
 *   main menu.
 * - `--tlui-libraries-panel-inset-side`: the gap between the panel and its side of the canvas.
 *   Defaults to `8px`.
 * - `--tlui-libraries-panel-max-height`: the tallest the panel grows before it scrolls. Defaults to
 *   the canvas's height less the two insets, at most `720px`.
 * - `--tlui-libraries-columns`: tiles to a row. Defaults to `3`.
 *
 * `--tlui-libraries-tile-width` is the width of a tile, `86.67px` by default, and the panel is three
 * tiles wide (280px with its 20px of gutter) whatever the number of columns. The default is set on the panel itself, so override
 * it with a rule on `.tlui-libraries-panel`. Read it to size an `ItemTile` override or anything
 * else to match the tiles.
 * @public @react
 */
export function LibrariesPanel({ components, ...props }: LibrariesPanelProps) {
	return (
		<LibrariesComponentsProvider components={components}>
			<LibrariesPanelContent {...props} />
		</LibrariesComponentsProvider>
	)
}

function LibrariesPanelContent({
	source,
	side = 'left',
	menuItems,
	prepareItemContent,
	placeItem,
	getBrowseGroups,
}: Omit<LibrariesPanelProps, 'components'>) {
	const editor = useEditor()
	const { LibrariesPanelHeader = DefaultLibrariesPanelHeader, NoLibraries = DefaultNoLibraries } =
		useLibrariesComponentOverrides()
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const trackEvent = useUiEvents()
	const librariesEnabled = useLibrariesEnabled()
	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])
	const query = useValue('libraries search query', () => librariesSearchQuery.get(editor), [editor])
	const libraries = useLibraries(source)
	const sections = useValue('library sections', () => getPanelSections(source, libraries), [
		source,
		libraries,
	])
	const offers = useValue(
		'empty this file offers',
		() => getEmptyThisFileOffers(sections, getBrowseGroups ? getBrowseGroups() : []),
		[sections, getBrowseGroups]
	)
	const scopeId = useValue('libraries search scope', () => librariesSearchScope.get(editor), [
		editor,
	])
	const { scope, searched } = getSearchScope(libraries, scopeId)
	const renamingId = useValue('renaming library', () => renamingLibraryId.get(editor), [editor])
	const getItemProps = useLibraryItemDrag(source, { placeItem })
	const placeItemOnClick = usePlaceLibraryItem(source, placeItem)
	const createLibrary = useCreateLibrary(source)
	const newLibraryOwners = useValue(
		'new library owners',
		() => {
			const owners = getNewLibraryOwners(source)
			if (owners.length > 0) return owners
			return canCreateNewLibrary(source) ? [] : undefined
		},
		[source]
	)

	const canBrowse =
		!!(source.getAvailableLibraries && source.addLibraryToDocument) || !!getBrowseGroups
	const browse = () => {
		trackEvent('open-browse-libraries', { source: 'libraries' })
		addDialog({
			component: () => <BrowseLibrariesDialog source={source} getBrowseGroups={getBrowseGroups} />,
		})
	}

	if (!librariesEnabled || !open) return null
	const searching = searched.length > 0 && normalizeQuery(query) !== ''

	const renderSections = (list: TLLibrary[]) =>
		list.map((library) => (
			<LibrarySection
				key={library.id}
				source={source}
				library={library}
				getItemProps={getItemProps}
				placeItem={placeItemOnClick}
				prepareItemContent={prepareItemContent}
			/>
		))

	const renderLists = () => {
		if (searching) {
			return (
				<SearchResults
					source={source}
					libraries={searched}
					query={query}
					getItemProps={getItemProps}
					placeItem={placeItemOnClick}
					prepareItemContent={prepareItemContent}
				/>
			)
		}
		if (scope) return renderSections([scope])
		return (
			<>
				{sections ? (
					<>
						<div
							role="group"
							className="tlui-libraries-panel__group"
							aria-label={msg(messages.thisFile)}
						>
							<h3 className="tlui-libraries-panel__group-label">{msg(messages.thisFile)}</h3>
							{sections.thisFile.length > 0 ? (
								renderSections(sections.thisFile)
							) : (
								<EmptyThisFile offers={offers} onBrowse={canBrowse ? browse : undefined} />
							)}
						</div>
						{renderSections(sections.defaults)}
					</>
				) : (
					renderSections(libraries)
				)}
				{renamingId === null && (
					<AddMoreMenu
						create={newLibraryOwners && { owners: newLibraryOwners, onCreate: createLibrary }}
						onBrowse={canBrowse ? browse : undefined}
					/>
				)}
			</>
		)
	}

	return (
		<EditorPortal>
			<section
				className="tlui-libraries-panel"
				data-side={side}
				aria-label={msg(messages.title)}
				onContextMenu={(e) => e.stopPropagation()}
			>
				{LibrariesPanelHeader && <LibrariesPanelHeader menuItems={menuItems} />}
				{libraries.length > 0 && (
					<LibrariesSearch placeholder={msg(messages.search)} scope={scope} />
				)}
				<div className="tlui-libraries-sections">
					{libraries.length === 0 && NoLibraries && <NoLibraries />}
					{renderLists()}
				</div>
			</section>
		</EditorPortal>
	)
}
