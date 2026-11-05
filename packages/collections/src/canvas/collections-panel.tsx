import { Fragment, useCallback, useId, useState } from 'react'
import {
	defineMessages,
	EditorPortal,
	TldrawUiInput,
	PORTRAIT_BREAKPOINT,
	useBreakpoint,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { PackCatalogue } from '../lib/PackCatalogue'
import type { TLCollection, TLCollectionId, TLCollectionItemId } from '../lib/schema'
import { CollectionList } from '../ui/collection-list'
import { CollectionPicker } from '../ui/collection-picker'
import { CollectionTabs } from '../ui/collection-tabs'
import type { ItemGridAppearance } from '../ui/item-grid'
import { AddSelectionBar, AddSelectionMenuBar, type AddControl } from './add-selection-bar'
import {
	type CollectionGrouping,
	groupCollectionList,
	useCollectionGrouping,
} from './collection-groups'
import { CollectionItems } from './collection-items'
import { CollectionPreviewRow } from './collection-preview-row'
import {
	CollectionsPanelHeader,
	type PanelHeader,
	type ReadOnlyOptions,
} from './collections-panel-header'
import type { EmptyCollection } from './empty-collection'
import {
	defaultItemOrderings,
	getItemOrderChoice,
	setItemOrderChoice,
	type TLCollectionItemOrdering,
} from './item-order'
import { itemMatches, type ItemSearch } from './item-search'
import { NoCollections, type FirstUse } from './no-collections'
import { useOpenPackCatalogue } from './pack-catalogue-dialog'
import { placeCollectionItem, type PlaceItemOptions } from './place-item'
import { activeCollectionId, collapsedCollectionIds, collectionsPanelOpen } from './state'
import type { AddToCollectionOrder } from './use-add-targets'
import { useItemDrag } from './use-item-drag'
import type { SaveSelectionOptions } from './use-save-selection'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
	empty: { id: 'collections.empty', defaultMessage: 'No collections yet.' },
	searchCollection: { id: 'collections.search.collection', defaultMessage: 'Search by name' },
	searchEverywhere: {
		id: 'collections.search.everywhere',
		defaultMessage: 'Search all collections',
	},
	noMatches: { id: 'collections.search.no-matches', defaultMessage: 'No items match “{query}”.' },
	itemCount: {
		id: 'collections.item-count',
		defaultMessage: '{count, plural, one {# item} other {# items}}',
	},
	placeErrorTitle: { id: 'collections.place-error.title', defaultMessage: "Couldn't place item" },
	placeErrorDescription: {
		id: 'collections.place-error.description',
		defaultMessage: 'It may have been deleted. Try again, or pick another item.',
	},
})

/**
 * How the panel moves between collections:
 * - `'picker'`: a picker in the header over the open collection's items.
 * - `'list'`: a list of collections with their item counts, each opening into its items.
 * - `'sections'`: every collection in one scroll, each a section that folds shut.
 * - `'previews'`: a row per collection with its first few items, placeable from there, and how many
 *   more there are; the row opens into all its items.
 * - `'tabs'`: a tab per collection under the header, over the chosen collection's items.
 * @public
 */
export type CollectionsPanelNavigation = 'picker' | 'list' | 'sections' | 'previews' | 'tabs'

/** @public */
export interface CollectionsPanelProps {
	source: CollectionSource
	/** Defaults to `'sections'`. */
	navigation?: CollectionsPanelNavigation
	/**
	 * The ways users can order a collection's items, offered in the panel's ⋯ menu; the first is
	 * the default. Defaults to the source's order, newest first, and by name. With only one, the
	 * menu has no "Sort items by". Each user's choice is kept in their browser.
	 */
	itemOrderings?: TLCollectionItemOrdering[]
	/**
	 * Groups collections under headings: `'owner'` by who owns them, `'none'` not at all, or a
	 * function naming each collection's group. The list, sections and previews show a heading per
	 * group; the picker names each collection's group. The footer's menu of collections groups them
	 * the same way. Defaults to `'owner'`, which shows no headings for a source with one owner or
	 * none.
	 */
	groupCollections?: CollectionGrouping
	/** How item tiles are drawn: their style, columns, label and fit. */
	tileAppearance?: ItemGridAppearance
	/** Which side of the canvas the panel floats on. Defaults to `'left'`. */
	side?: 'left' | 'right'
	/** The panel's width in pixels, on screens wider than a phone. Defaults to 240. */
	width?: number
	/**
	 * On a phone-sized screen: `'panel'` keeps the floating panel (the default); `'sheet'` spans the
	 * bottom of the screen and closes once an item is placed.
	 */
	smallScreen?: 'panel' | 'sheet'
	/** What happens around a save from the panel's add controls: naming, confirmation and undo. */
	saving?: SaveSelectionOptions
	/** Where clicking an item places it. Dragging places it where it's dropped. */
	placement?: PlaceItemOptions
	/** What the panel shows before there are any collections. */
	firstUse?: FirstUse
	/** How the panel shows a collection the user can't add to. */
	readOnly?: ReadOnlyOptions
	/** Whether the panel has a search field, and where it looks. Search matches item names. */
	search?: ItemSearch
	/**
	 * What the header holds: the collection picker, or a title and close button. Defaults to
	 * `'picker'`. With `'title'` and the picker navigation, the picker sits under the header.
	 */
	header?: PanelHeader
	/**
	 * Where adding the selection is offered. `'footer'`: a bar along the bottom of the panel. With
	 * one collection showing it adds to that collection; with several (sections, the list, previews,
	 * or searching everywhere) it opens a menu of collections, as the "Add to collection" context
	 * menu does. `'header'`: a "+" in the header, and in each section's header. Defaults to
	 * `'footer'`.
	 */
	addControl?: AddControl
	/** How the footer's menu of collections orders them. Defaults to `'source'`. */
	addMenuOrder?: AddToCollectionOrder
	/** What a collection with no items shows. Defaults to `'message'`. */
	emptyCollection?: EmptyCollection
	/**
	 * In sections, how many rows of items each section shows before a "Show all" control reveals
	 * the rest. Defaults to 2. Pass `Infinity` to show every item.
	 */
	sectionRows?: number
	/**
	 * Packs users can add to the panel: the panel's ⋯ menu and its empty state offer "Browse
	 * collections", and each added pack's ⋯ menu offers "Remove from panel". Usually a
	 * {@link PackCollectionSource} that is also part of `source`, so added packs are listed.
	 */
	catalogue?: PackCatalogue
}

/**
 * A floating panel on one side of the canvas for browsing a {@link CollectionSource}, shown while
 * {@link collectionsPanelOpen} is set. Clicking an item places a copy of it in the middle of the
 * viewport; dragging one out drops it under the pointer.
 * @public @react
 */
export function CollectionsPanel({
	source,
	navigation = 'sections',
	itemOrderings = defaultItemOrderings,
	groupCollections = 'owner',
	tileAppearance,
	side = 'left',
	width = 240,
	smallScreen = 'panel',
	saving,
	placement,
	firstUse = 'message',
	readOnly,
	search = 'none',
	header = 'picker',
	addControl = 'footer',
	addMenuOrder = 'source',
	emptyCollection = 'message',
	sectionRows = 2,
	catalogue,
}: CollectionsPanelProps) {
	const editor = useEditor()
	const openCatalogue = useOpenPackCatalogue(catalogue)
	const msg = useTranslation()
	const { addToast } = useToasts()
	const open = useValue('collections panel open', () => collectionsPanelOpen.get(editor), [editor])
	const collections = useValue('collections', () => source.getCollections(), [source])
	const grouping = useCollectionGrouping(source, groupCollections)
	const activeId = useValue('active collection', () => activeCollectionId.get(editor), [editor])
	// With a picker or tabs, a stale id (the collection was deleted) falls back to the first
	// collection rather than an empty panel. With the list, no open collection shows the list.
	const current =
		collections.find((collection) => collection.id === activeId) ??
		(navigation === 'picker' || navigation === 'tabs' ? collections[0] : undefined)
	const tabPanelId = useId()
	const [query, setQuery] = useState('')
	const searchingEverywhere = search === 'everywhere' && query.trim() !== ''
	const matchingCollections = useValue(
		'collections with matches',
		() =>
			searchingEverywhere
				? collections.filter((c) => source.getItems(c.id).some((item) => itemMatches(item, query)))
				: [],
		[source, collections, query, searchingEverywhere]
	)
	// 'collection' search filters item grids, so it needs one showing; 'everywhere' works from any view.
	const showSearch =
		search !== 'none' &&
		collections.length > 0 &&
		(search === 'everywhere' || navigation === 'sections' || current !== undefined)
	const filter = search === 'collection' ? query : ''
	const itemCounts = useValue(
		'collection item counts',
		() => new Map(collections.map((c) => [c.id, source.getItems(c.id).length])),
		[source, collections]
	)
	const collapsed = useValue('collapsed collections', () => collapsedCollectionIds.get(editor), [
		editor,
	])
	const orderChoices = useValue(
		'item orders',
		() => new Map(collections.map((c) => [c.id, getItemOrderChoice(source.id, c.id)])),
		[source, collections]
	)
	const choiceOf = (collectionId: TLCollectionId) =>
		orderChoices.get(collectionId) ?? getItemOrderChoice(source.id, collectionId)
	const orderOf = (collectionId: TLCollectionId) => {
		const choice = choiceOf(collectionId)
		// A stored choice the host no longer offers falls back to its first ordering.
		const ordering = itemOrderings.find((o) => o.id === choice.orderingId) ?? itemOrderings[0]
		return { ordering, reversed: choice.reversed }
	}
	const sortFor = (collectionId: TLCollectionId) => {
		if (itemOrderings.length < 2) return undefined
		const choice = choiceOf(collectionId)
		const { ordering } = orderOf(collectionId)
		return {
			options: itemOrderings.map(({ id, label }) => ({ id, label })),
			value: ordering.id,
			onValueChange: (orderingId: string) =>
				setItemOrderChoice(source.id, collectionId, { ...choice, orderingId }),
			reversed: choice.reversed,
			onReversedChange: (reversed: boolean) =>
				setItemOrderChoice(source.id, collectionId, { ...choice, reversed }),
		}
	}
	const breakpoint = useBreakpoint()
	const isSheet = smallScreen === 'sheet' && breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM
	const placeItem = useCallback(
		(itemId: TLCollectionItemId) => {
			// A sheet covers the canvas, so it gets out of the way of what was just placed.
			if (isSheet) collectionsPanelOpen.set(editor, false)
			placeCollectionItem(editor, source, itemId, placement).catch(() => {
				addToast({
					title: msg(messages.placeErrorTitle),
					description: msg(messages.placeErrorDescription),
					severity: 'error',
				})
			})
		},
		[editor, source, addToast, msg, isSheet, placement]
	)
	const getItemProps = useItemDrag(source, placeItem)
	const collectionOptions = collections.map((collection) => ({
		id: collection.id,
		name: collection.name,
		detail: grouping?.groupOf(collection),
	}))
	// With one collection showing, the footer's bar adds to it; with several, it opens a menu.
	const showsOneCollection =
		current !== undefined && navigation !== 'sections' && !searchingEverywhere
	const countOf = (collection: TLCollection) => itemCounts.get(collection.id) ?? 0
	const groups = groupCollectionList(collections, grouping)
	const groupHeading = (label?: string) =>
		label && <h3 className="tlui-collections-group__heading">{label}</h3>

	if (!open) return null

	const body = () => {
		if (searchingEverywhere) {
			if (matchingCollections.length === 0) {
				return <p className="tlui-collections-panel__empty">{msg(messages.noMatches, { query })}</p>
			}
			return (
				<div className="tlui-collections-sections">
					{matchingCollections.map((collection) => (
						<section key={collection.id} className="tlui-collections-section">
							<h3 className="tlui-collections-group__heading">{collection.name}</h3>
							<CollectionItems
								source={source}
								collectionId={collection.id}
								getItemProps={getItemProps}
								{...orderOf(collection.id)}
								appearance={tileAppearance}
								query={query}
							/>
						</section>
					))}
				</div>
			)
		}
		if (navigation === 'sections') {
			if (collections.length === 0) {
				return <NoCollections source={source} firstUse={firstUse} onBrowse={openCatalogue} />
			}
			return (
				<div className="tlui-collections-sections">
					{groups.map((group) => (
						<Fragment key={group.label ?? ''}>
							{groupHeading(group.label)}
							{group.collections.map((collection) => {
								const isCollapsed = collapsed.includes(collection.id)
								return (
									<section key={collection.id} className="tlui-collections-section">
										<CollectionsPanelHeader
											saving={saving}
											readOnly={readOnly}
											source={source}
											collections={collections}
											current={collection}
											itemCount={countOf(collection)}
											collapsed={isCollapsed}
											addButton={addControl === 'header'}
											sort={sortFor(collection.id)}
											catalogue={catalogue}
											onToggleCollapsed={() =>
												collapsedCollectionIds.update(editor, (ids) =>
													isCollapsed
														? ids.filter((id) => id !== collection.id)
														: [...ids, collection.id]
												)
											}
										/>
										{!isCollapsed && (
											<CollectionItems
												source={source}
												collectionId={collection.id}
												getItemProps={getItemProps}
												{...orderOf(collection.id)}
												appearance={tileAppearance}
												query={filter}
												emptyCollection={emptyCollection}
												saving={saving}
												readOnly={readOnly}
												maxRows={filter.trim() === '' ? sectionRows : undefined}
											/>
										)}
									</section>
								)
							})}
						</Fragment>
					))}
				</div>
			)
		}
		if (current) {
			const items = (
				<CollectionItems
					source={source}
					collectionId={current.id}
					getItemProps={getItemProps}
					{...orderOf(current.id)}
					appearance={tileAppearance}
					query={filter}
					emptyCollection={emptyCollection}
					saving={saving}
					readOnly={readOnly}
				/>
			)
			if (navigation !== 'tabs') return items
			return (
				<div
					id={tabPanelId}
					role="tabpanel"
					aria-label={current.name}
					className="tlui-collections-tabpanel"
				>
					{items}
				</div>
			)
		}
		if (navigation === 'previews') {
			if (collections.length === 0) {
				return <NoCollections source={source} firstUse={firstUse} onBrowse={openCatalogue} />
			}
			return (
				<div className="tlui-collections-sections">
					{groups.map((group) => (
						<Fragment key={group.label ?? ''}>
							{groupHeading(group.label)}
							<ul className="tlui-collections-previews">
								{group.collections.map((collection) => (
									<CollectionPreviewRow
										key={collection.id}
										source={source}
										collection={collection}
										{...orderOf(collection.id)}
										getItemProps={getItemProps}
										onOpen={() => activeCollectionId.set(editor, collection.id)}
									/>
								))}
							</ul>
						</Fragment>
					))}
				</div>
			)
		}
		if (navigation === 'list') {
			if (collections.length === 0) {
				return <NoCollections source={source} firstUse={firstUse} onBrowse={openCatalogue} />
			}
			return (
				<div className="tlui-collections-sections">
					{groups.map((group) => (
						<Fragment key={group.label ?? ''}>
							{groupHeading(group.label)}
							<CollectionList
								collections={group.collections.map((collection) => ({
									id: collection.id,
									name: collection.name,
									detail: msg(messages.itemCount, { count: countOf(collection) }),
								}))}
								onOpen={(id) => activeCollectionId.set(editor, id)}
								empty={msg(messages.empty)}
							/>
						</Fragment>
					))}
				</div>
			)
		}
		return <NoCollections source={source} firstUse={firstUse} onBrowse={openCatalogue} />
	}

	return (
		<EditorPortal>
			<section
				className="tlui-collections-panel"
				data-side={side}
				data-layout={isSheet ? 'sheet' : 'panel'}
				style={isSheet ? undefined : { width }}
				aria-label={msg(messages.title)}
				onContextMenu={(e) => e.stopPropagation()}
			>
				<CollectionsPanelHeader
					saving={saving}
					readOnly={readOnly}
					source={source}
					collections={collections}
					current={navigation === 'sections' ? undefined : current}
					itemCount={current ? countOf(current) : 0}
					onBack={
						navigation === 'list' || navigation === 'previews'
							? () => activeCollectionId.set(editor, null)
							: undefined
					}
					groupCollections={grouping?.groupOf}
					sort={navigation !== 'sections' && current ? sortFor(current.id) : undefined}
					title={header === 'title'}
					onClose={header === 'title' ? () => collectionsPanelOpen.set(editor, false) : undefined}
					addButton={addControl === 'header'}
					catalogue={catalogue}
				/>
				{header === 'title' && navigation === 'picker' && current && (
					<div className="tlui-collections-panel__picker">
						<CollectionPicker
							collections={collectionOptions}
							value={current.id}
							onValueChange={(id) => activeCollectionId.set(editor, id)}
							label={msg(messages.title)}
						/>
					</div>
				)}
				{navigation === 'tabs' && current && (
					<CollectionTabs
						collections={collectionOptions}
						value={current.id}
						onValueChange={(id) => activeCollectionId.set(editor, id)}
						label={msg(messages.title)}
						panelId={tabPanelId}
					/>
				)}
				{showSearch && (
					<div className="tlui-collections-search">
						<TldrawUiInput
							className="tlui-collections-search__input"
							value={query}
							onValueChange={setQuery}
							onCancel={() => setQuery('')}
							placeholder={msg(
								search === 'everywhere' ? messages.searchEverywhere : messages.searchCollection
							)}
							aria-label={msg(
								search === 'everywhere' ? messages.searchEverywhere : messages.searchCollection
							)}
						/>
					</div>
				)}
				{body()}
				{addControl === 'footer' &&
					(showsOneCollection && current ? (
						<AddSelectionBar
							source={source}
							collectionId={current.id}
							saving={saving}
							readOnly={readOnly}
						/>
					) : (
						<AddSelectionMenuBar
							source={source}
							order={addMenuOrder}
							groupCollections={groupCollections}
							saving={saving}
							readOnly={readOnly}
						/>
					))}
			</section>
		</EditorPortal>
	)
}
