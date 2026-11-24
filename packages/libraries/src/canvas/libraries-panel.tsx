import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
	defineMessages,
	EditorPortal,
	useDialogs,
	useEditor,
	useTranslation,
	useUiEvents,
	useValue,
	type TLLibrary,
	type TLLibraryItemId,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { BrowseLibrariesDialog, type LibraryBrowseGroup } from './browse-libraries-dialog'
import { BrowseMoreButton } from './browse-more-button'
import { CreateLibraryButton } from './create-library-button'
import { EmptyThisFile } from './empty-this-file'
import {
	type LibrariesComponents,
	LibrariesComponentsProvider,
	useLibrariesComponentOverrides,
} from './libraries-components'
import { LibrariesPanelHeader as DefaultLibrariesPanelHeader } from './libraries-panel-header'
import { LibrariesSearch } from './libraries-search'
import { LibrariesSheet } from './libraries-sheet'
import { LibrarySection } from './library-section'
import { useLibrariesEnabled } from './license'
import { canCreateNewLibrary, getNewLibraryOwners } from './new-library'
import { NoLibraries as DefaultNoLibraries } from './no-libraries'
import { normalizeQuery } from './panel-search'
import { getEmptyThisFileOffers, getPanelSections } from './panel-sections'
import { defaultPlaceLibraryItem, type LibraryItemPlacer } from './place-item'
import type { PrepareItemContent } from './save-shapes'
import { SearchResults } from './search-results'
import { librariesPanelOpen, librariesSearchQuery } from './state'
import { SuggestedLibraries } from './suggested-libraries'
import { useCreateLibrary } from './use-create-library'
import { useIsPhone } from './use-is-phone'
import { useLibraryItemDrag } from './use-item-drag'
import { useLibraries } from './use-libraries'
import { usePlaceItem } from './use-place-item'

const messages = defineMessages({
	title: { id: 'libraries.title', defaultMessage: 'Libraries' },
	thisBoard: { id: 'libraries.panel.this-board', defaultMessage: 'This board' },
	search: { id: 'libraries.search.label', defaultMessage: 'Search libraries' },
	searchPlaceholder: { id: 'libraries.search.placeholder', defaultMessage: 'Search…' },
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
 * says why its libraries are shown (see {@link LibrarySource.getLibraryPlacement}) lists the user's
 * default, then those in the document under "This board", starting with the document's own; any
 * other source lists its libraries as they come. Setting {@link activeLibraryId} brings that
 * library into view. Clicking an item places a copy of it in the middle of the viewport; dragging
 * one out drops it under the pointer.
 *
 * A drag starts once the pointer has left the panel and moved past the editor's
 * `uiDragDistanceSquared` option (`uiCoarseDragDistanceSquared` for touch and pen), as dragging a
 * tool out of the toolbar does. Set them with `<Tldraw options={{ … }}>`.
 *
 * On a phone, below the breakpoint where tldraw's toolbar takes its mobile layout, the panel is a
 * modal sheet along the bottom of the screen instead, at half its height or reaching up to the top
 * bar. There, a tap on an item places it and closes the sheet, a long press opens an item's or a
 * library's menu, and items aren't dragged out.
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
	const isPhone = useIsPhone()
	const [browsing, setBrowsing] = useState(false)
	if (browsing && (!open || !isPhone)) setBrowsing(false)
	const browseMoreRef = useRef<HTMLButtonElement>(null)
	const backFromBrowse = useRef(false)
	useLayoutEffect(() => {
		if (browsing || !backFromBrowse.current) return
		backFromBrowse.current = false
		if (browseMoreRef.current) browseMoreRef.current.focus()
	}, [browsing])
	const placeAndClose = useMemo<LibraryItemPlacer | undefined>(() => {
		if (!isPhone) return placeItem
		const place = placeItem ?? defaultPlaceLibraryItem
		return (editor, placement) => {
			const ids = place(editor, placement)
			librariesPanelOpen.set(editor, false)
			return ids
		}
	}, [isPhone, placeItem])
	const getItemProps = useLibraryItemDrag(source, { placeItem: placeAndClose })
	const placeOnClick = usePlaceItem(source, placeAndClose)
	const placeItemOnClick = useCallback(
		(itemId: TLLibraryItemId) => placeOnClick(itemId, 'libraries'),
		[placeOnClick]
	)
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
		if (isPhone) {
			setBrowsing(true)
			return
		}
		addDialog({
			component: () => <BrowseLibrariesDialog source={source} getBrowseGroups={getBrowseGroups} />,
		})
	}
	const leaveBrowse = () => {
		backFromBrowse.current = true
		setBrowsing(false)
	}

	if (!librariesEnabled || !open) return null
	const searching = libraries.length > 0 && normalizeQuery(query) !== ''

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
					libraries={libraries}
					query={query}
					getItemProps={getItemProps}
					placeItem={placeItemOnClick}
					prepareItemContent={prepareItemContent}
				/>
			)
		}
		return sections ? (
			<>
				{renderSections(sections.defaults)}
				<div
					role="group"
					className="tlui-libraries-panel__group"
					aria-label={msg(messages.thisBoard)}
				>
					{sections.document.length > 0 ? (
						<>
							{renderSections(sections.document)}
							{renderSections(sections.thisFile)}
							{offers.length > 0 && (
								<div className="tlui-libraries-panel__suggested">
									<SuggestedLibraries offers={offers} />
								</div>
							)}
						</>
					) : (
						<>
							<h3 className="tlui-libraries-panel__group-label">{msg(messages.thisBoard)}</h3>
							{sections.thisFile.length > 0 ? (
								renderSections(sections.thisFile)
							) : (
								<EmptyThisFile offers={offers} />
							)}
						</>
					)}
				</div>
			</>
		) : (
			renderSections(libraries)
		)
	}

	const create = newLibraryOwners && { owners: newLibraryOwners, onCreate: createLibrary }
	const contents = (
		<>
			{LibrariesPanelHeader && (
				<LibrariesPanelHeader
					menuItems={menuItems}
					create={create}
					onBrowse={canBrowse ? browse : undefined}
				/>
			)}
			{libraries.length > 0 && (
				<LibrariesSearch
					label={msg(messages.search)}
					placeholder={msg(messages.searchPlaceholder)}
				/>
			)}
			<div className="tlui-libraries-sections" onScroll={() => editor.menus.clearOpenMenus()}>
				{libraries.length === 0 && NoLibraries && <NoLibraries />}
				{renderLists()}
				{!searching && create && <CreateLibraryButton create={create} />}
			</div>
			{!searching && canBrowse && <BrowseMoreButton ref={browseMoreRef} onBrowse={browse} />}
		</>
	)

	if (isPhone) {
		return (
			<LibrariesSheet label={browsing ? undefined : msg(messages.title)}>
				{browsing ? (
					<BrowseLibrariesDialog
						source={source}
						getBrowseGroups={getBrowseGroups}
						onBack={leaveBrowse}
					/>
				) : (
					contents
				)}
			</LibrariesSheet>
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
				{contents}
			</section>
		</EditorPortal>
	)
}
