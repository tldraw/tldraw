import {
	createContext,
	type ReactNode,
	type SyntheticEvent,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiIcon,
	TldrawUiTooltip,
	useDirection,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryThumbnail,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { getLibraryItemCount, getLibraryPreviewItems } from '../lib/librarySummary'
import { getThumbnailForColorMode } from '../lib/schema'
import { getContextMenuHandlers, openContextMenu } from '../ui/context-menu'
import { LibraryMenu, type LibraryMenuProps } from '../ui/library-menu'
import { RenameInput } from '../ui/rename-input'
import {
	type BrowseSections,
	getBrowseSections,
	isAddedToDocument,
	keepBrowsePlacement,
} from './browse-groups'
import { CreateLibraryButton } from './create-library-button'
import { CreateLibraryItem, type LibrariesPanelHeaderCreate } from './libraries-panel-header'
import { useLongPress } from './long-press'
import { activeLibraryId, librariesPanelOpen } from './state'
import { useLibraryActions } from './use-library-actions'
import { useLibraryThumbnailUrls } from './use-library-thumbnail-urls'

/** Tiles in a row's strip. A library with more items shows one fewer, then a "+ N" tile. */
const PREVIEW_COUNT = 5

const messages = defineMessages({
	title: { id: 'libraries.browse.title', defaultMessage: 'Browse libraries' },
	empty: { id: 'libraries.browse.empty', defaultMessage: 'No libraries to add.' },
	emptyLibrary: { id: 'libraries.browse.empty-library', defaultMessage: 'This library is empty.' },
	more: { id: 'libraries.browse.more', defaultMessage: '{count, plural, other {+ #}}' },
	moreLabel: {
		id: 'libraries.browse.more-label',
		defaultMessage: '{count, plural, one {# more item} other {# more items}}',
	},
	add: { id: 'libraries.browse.add', defaultMessage: 'Add to file' },
	view: { id: 'libraries.browse.view', defaultMessage: 'View the items in {name}' },
	back: { id: 'libraries.back', defaultMessage: 'Back' },
	unnamedItem: { id: 'libraries.unnamed-item', defaultMessage: 'Unnamed item' },
	loadErrorTitle: {
		id: 'libraries.browse.load-error.title',
		defaultMessage: "Couldn't load items",
	},
	added: { id: 'libraries.browse.added', defaultMessage: 'Added' },
	addErrorTitle: {
		id: 'libraries.browse.add-error.title',
		defaultMessage: "Couldn't add library",
	},
	remove: { id: 'libraries.browse.remove', defaultMessage: 'Remove from file' },
	changeErrorTitle: {
		id: 'libraries.library-error.title',
		defaultMessage: "Couldn't change library",
	},
})

/**
 * A group of the host's own in the "Browse libraries" dialog, listed after the source's, such as
 * libraries an app ships as data.
 * @public
 */
export interface LibraryBrowseGroup {
	id: string
	label: string
	entries: LibraryBrowseEntry[]
}

/** @public */
export interface LibraryBrowseEntry {
	id: string
	name: string
	itemCount: number
	/** Thumbnails of a few of its items. The first five are shown. */
	previews: (TLLibraryThumbnail | undefined)[]
	/**
	 * Whether the document already shows it: listed with those added to the file as "Added", and
	 * can't be added again.
	 */
	added: boolean
	/**
	 * The library the document shows for it, once added. The source's library with this id is then
	 * listed only as this entry.
	 */
	libraryId?: TLLibraryId
	canAdd: boolean
	/** Adds it to the document, resolving to the id of the library that now shows for it. */
	add(): Promise<TLLibraryId>
	/**
	 * Removes it from the document, leaving the library itself as it is. Leave out where it isn't
	 * added or can't be removed, and it shows as "Added" with no way to remove it.
	 */
	remove?(): Promise<void>
	/**
	 * Loads all its items, for viewing them before adding it. Leave out and it can't be opened to
	 * view them.
	 */
	getItems?(): Promise<LibraryBrowseEntryItem[]>
}

/** An item of a {@link LibraryBrowseEntry}, as shown before the library is added. @public */
export interface LibraryBrowseEntryItem {
	id: string
	name?: string
	thumbnail?: TLLibraryThumbnail
}

/** What the dialog has opened to view, looked up again as the groups change. */
type Viewing = { kind: 'source'; libraryId: TLLibraryId } | { kind: 'host'; entryId: string }

export interface BrowseLibrariesDialogProps {
	source: LibrarySource
	getBrowseGroups?(): LibraryBrowseGroup[]
	/** For "Create library" in the header's menu and the footer. Left out where it isn't allowed. */
	create?: LibrariesPanelHeaderCreate
	/** Closes the dialog, as creating a library does to show it in the panel. */
	onClose?(): void
	/**
	 * Shows it as a view in the libraries sheet in place of a dialog, with a Back button that calls
	 * this where the dialog has its ✕.
	 */
	onBack?(): void
}

/** Keeps the row the user last pressed or focused where it is on screen as the list changes. */
const HoldInViewContext = createContext<((row: HTMLElement) => void) | undefined>(undefined)

function useHoldInView() {
	const held = useRef<{ row: HTMLElement; top: number; stop(): void } | undefined>(undefined)
	useLayoutEffect(() => {
		const hold = held.current
		if (!hold || !hold.row.isConnected) return
		const body = hold.row.closest('.tlui-dialog__body')
		const top = hold.row.getBoundingClientRect().top
		if (body && top !== hold.top) body.scrollTop += top - hold.top
		hold.top = hold.row.getBoundingClientRect().top
	})
	useEffect(() => () => held.current?.stop(), [])
	return useCallback((row: HTMLElement) => {
		if (held.current && held.current.row === row) return
		if (held.current) held.current.stop()
		const body = row.closest('.tlui-dialog__body')
		const onScroll = () => {
			if (held.current) held.current.top = row.getBoundingClientRect().top
		}
		if (body) body.addEventListener('scroll', onScroll, { passive: true })
		held.current = {
			row,
			top: row.getBoundingClientRect().top,
			stop: () => body?.removeEventListener('scroll', onScroll),
		}
	}, [])
}

/** Set where Browse is a view in the libraries sheet: leaves it for the libraries again. */
const SheetBackContext = createContext<(() => void) | undefined>(undefined)

export function BrowseLibrariesDialog({ onBack, ...props }: BrowseLibrariesDialogProps) {
	return (
		<SheetBackContext.Provider value={onBack}>
			<BrowseLibraries {...props} />
		</SheetBackContext.Provider>
	)
}

type BrowseRowEntry =
	| { key: string; kind: 'source'; library: TLLibrary }
	| { key: string; kind: 'host'; entry: LibraryBrowseEntry }

interface BrowseLists {
	/** The source's libraries, and the host's entries added to the file: those added first. */
	rows: BrowseRowEntry[]
	/** The host's groups, e.g. "Public libraries", each listed under its label. */
	hostGroups: { id: string; label: string; rows: BrowseRowEntry[] }[]
}

/** The libraries `sections` lists, in its order. */
function getBrowseLists(sections: BrowseSections): BrowseLists {
	const sourceRow = (library: TLLibrary): BrowseRowEntry => ({
		key: `source:${library.id}`,
		kind: 'source',
		library,
	})
	const hostRow = (entry: LibraryBrowseEntry): BrowseRowEntry => ({
		key: `host:${entry.id}`,
		kind: 'host',
		entry,
	})
	return {
		rows: [
			...sections.thisFile.map((listed) =>
				listed.kind === 'source' ? sourceRow(listed.library) : hostRow(listed.entry)
			),
			...sections.owners.flatMap((group) => group.libraries.map(sourceRow)),
		],
		hostGroups: sections.hosts.map((group) => ({
			id: group.id,
			label: group.label,
			rows: group.entries.map(hostRow),
		})),
	}
}

function BrowseLibraries({
	source,
	getBrowseGroups: getHostGroups,
	create,
	onClose,
}: Omit<BrowseLibrariesDialogProps, 'onBack'>) {
	const editor = useEditor()
	const sheetBack = useContext(SheetBackContext)
	const msg = useTranslation()
	const nextSections = useValue(
		'browse sections',
		() => getBrowseSections(source, getHostGroups ? getHostGroups() : []),
		[source, getHostGroups]
	)
	const shownSections = useRef<BrowseSections | undefined>(undefined)
	const sections = useMemo(
		() => keepBrowsePlacement(shownSections.current, nextSections),
		[nextSections]
	)
	useLayoutEffect(() => {
		shownSections.current = sections
	}, [sections])
	const lists = useMemo(() => getBrowseLists(sections), [sections])
	const rows = [...lists.rows, ...lists.hostGroups.flatMap((group) => group.rows)]
	const holdInView = useHoldInView()
	const [viewing, setViewing] = useState<Viewing | null>(null)
	const listRef = useRef<HTMLDivElement>(null)
	useLayoutEffect(() => {
		if (sheetBack || viewing) return
		const content = listRef.current && listRef.current.closest('.tlui-dialog__content')
		if (content instanceof HTMLElement) content.focus()
	}, [sheetBack, viewing])
	const back = () => setViewing(null)
	const close = sheetBack ?? onClose
	const createAndShow = create && {
		owners: create.owners,
		onCreate(ownerId?: string) {
			create.onCreate(ownerId)
			librariesPanelOpen.set(editor, true)
			if (close) close()
		},
	}

	const renderRow = (row: BrowseRowEntry) =>
		row.kind === 'source' ? (
			<SourceLibraryRow
				key={row.key}
				source={source}
				library={row.library}
				onView={() => setViewing({ kind: 'source', libraryId: row.library.id })}
			/>
		) : (
			<HostLibraryRow
				key={row.key}
				entry={row.entry}
				onView={
					row.entry.getItems ? () => setViewing({ kind: 'host', entryId: row.entry.id }) : undefined
				}
			/>
		)

	if (viewing?.kind === 'source') {
		const row = rows.find((r) => r.kind === 'source' && r.library.id === viewing.libraryId)
		if (row && row.kind === 'source') {
			return <SourceLibraryView source={source} library={row.library} onBack={back} />
		}
	}
	if (viewing?.kind === 'host') {
		const row = rows.find((r) => r.kind === 'host' && r.entry.id === viewing.entryId)
		if (row && row.kind === 'host') return <HostLibraryView entry={row.entry} onBack={back} />
	}

	return (
		<HoldInViewContext.Provider value={holdInView}>
			<BrowseHeader
				title={msg(messages.title)}
				onBack={sheetBack}
				menu={
					createAndShow && (
						<LibraryMenu id="libraries-browse-menu">
							<CreateLibraryItem create={createAndShow} />
						</LibraryMenu>
					)
				}
			/>
			<TldrawUiDialogBody className="tlui-libraries-browse">
				<div ref={listRef}>
					{rows.length === 0 && (
						<p className="tlui-libraries-panel__empty">{msg(messages.empty)}</p>
					)}
					{lists.rows.length > 0 && (
						<ul className="tlui-libraries-browse__rows">{lists.rows.map(renderRow)}</ul>
					)}
					{lists.hostGroups.map((group) => (
						<section
							key={group.id}
							className="tlui-libraries-browse__group"
							aria-label={group.label}
						>
							<h3 className="tlui-libraries-browse__group-label">{group.label}</h3>
							<ul className="tlui-libraries-browse__rows">{group.rows.map(renderRow)}</ul>
						</section>
					))}
				</div>
			</TldrawUiDialogBody>
			{createAndShow && (
				<TldrawUiDialogFooter className="tlui-libraries-browse__footer">
					<CreateLibraryButton create={createAndShow} />
				</TldrawUiDialogFooter>
			)}
		</HoldInViewContext.Provider>
	)
}

/**
 * A Browse view's title, after a Back button where there's somewhere to go back to, and before its
 * menu and the dialog's ✕. In the libraries sheet there's always a Back, which takes focus, and no
 * ✕. While renaming, an input in place of the title.
 */
function BrowseHeader({
	title,
	onBack,
	menu,
	rename,
}: {
	title: string
	onBack?(): void
	menu?: ReactNode
	rename?: { onComplete(name: string): void; onCancel(): void }
}) {
	const msg = useTranslation()
	const dir = useDirection()
	const inSheet = useContext(SheetBackContext) !== undefined
	const backRef = useRef<HTMLButtonElement>(null)
	useLayoutEffect(() => {
		if (inSheet && backRef.current) backRef.current.focus()
	}, [inSheet])
	return (
		<TldrawUiDialogHeader className="tlui-libraries-browse__header">
			{onBack && (
				<TldrawUiButton
					ref={backRef}
					type="icon"
					className="tlui-libraries-browse__back"
					onClick={onBack}
					onTouchEnd={(e) => {
						if (!e.cancelable) return
						e.preventDefault()
						onBack()
					}}
					tooltip={msg(messages.back)}
					title={msg(messages.back)}
				>
					<TldrawUiButtonIcon icon={dir === 'rtl' ? 'chevron-right' : 'chevron-left'} small />
				</TldrawUiButton>
			)}
			{rename ? (
				<RenameInput
					className="tlui-libraries-browse__rename"
					defaultValue={title}
					onComplete={rename.onComplete}
					onCancel={rename.onCancel}
				/>
			) : (
				<TldrawUiDialogTitle>{title}</TldrawUiDialogTitle>
			)}
			{!rename && menu}
			{!inSheet && <TldrawUiDialogCloseButton />}
		</TldrawUiDialogHeader>
	)
}

export function useAdd(add: () => Promise<TLLibraryId>) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const [adding, setAdding] = useState(false)
	const run = () => {
		setAdding(true)
		add()
			.then(
				(libraryId) => activeLibraryId.set(editor, libraryId),
				() =>
					addToast({
						title: msg(messages.addErrorTitle),
						severity: 'error',
					})
			)
			.finally(() => setAdding(false))
	}
	return { adding, run }
}

function useRemove(remove: (() => Promise<void>) | undefined) {
	const msg = useTranslation()
	const { addToast } = useToasts()
	const [removing, setRemoving] = useState(false)
	if (!remove) return { removing, run: undefined }
	const run = () => {
		setRemoving(true)
		remove()
			.catch(() =>
				addToast({
					title: msg(messages.changeErrorTitle),
					severity: 'error',
				})
			)
			.finally(() => setRemoving(false))
	}
	return { removing, run }
}

/** Whether a library is in the file, and adding it to or removing it from the file. */
interface LibraryPlacement {
	added: boolean
	/** Leave out where it can't be added now: it's added, being added, or the user may not. */
	onAdd?(): void
	/** Leave out where it isn't added, or can't be removed. */
	onRemove?(): void
	busy: boolean
}

/** Adding the source's library to the file and removing it, as Browse offers them. */
function useSourcePlacement(source: LibrarySource, libraryId: TLLibraryId): LibraryPlacement {
	const added = useValue('library added', () => isAddedToDocument(source, libraryId), [
		source,
		libraryId,
	])
	const can = useValue(
		'library placement permissions',
		() => ({
			add: !!source.addLibraryToDocument && source.can('addLibraryToDocument', libraryId),
			remove:
				!!source.removeLibraryFromDocument && source.can('removeLibraryFromDocument', libraryId),
		}),
		[source, libraryId]
	)
	const add = useAdd(async () => {
		if (!source.addLibraryToDocument) throw new Error(`Source ${source.id} can't add libraries`)
		await source.addLibraryToDocument(libraryId)
		return libraryId
	})
	const remove = useRemove(
		added && can.remove
			? async () => {
					if (!source.removeLibraryFromDocument) {
						throw new Error(`Source ${source.id} can't remove libraries`)
					}
					await source.removeLibraryFromDocument(libraryId)
				}
			: undefined
	)
	return {
		added,
		onAdd: !added && can.add && !add.adding ? add.run : undefined,
		onRemove: remove.removing ? undefined : remove.run,
		busy: add.adding || remove.removing,
	}
}

/** Adding a host's entry to the file and removing it, as Browse offers them. */
function useHostPlacement(entry: LibraryBrowseEntry): LibraryPlacement {
	const add = useAdd(entry.add)
	const remove = useRemove(entry.added ? entry.remove : undefined)
	return {
		added: entry.added,
		onAdd: !entry.added && entry.canAdd && !add.adding ? add.run : undefined,
		onRemove: remove.removing ? undefined : remove.run,
		busy: add.adding || remove.removing,
	}
}

/**
 * The menu for the source's library in Browse, and renaming it in place: the library's own
 * actions, with adding it to and removing it from the file first.
 */
function useSourceLibraryMenu(
	source: LibrarySource,
	library: TLLibrary,
	placement: LibraryPlacement
) {
	const { onRenameComplete, menuActions } = useLibraryActions(source, library)
	const [renaming, setRenaming] = useState(false)
	const menuProps: Omit<LibraryMenuProps, 'id'> = {
		onAddToDocument: placement.onAdd,
		onRemoveFromDocument: placement.onRemove,
		onRename: menuActions.onRename && (() => setRenaming(true)),
		copy: menuActions.copy,
		onDelete: menuActions.onDelete,
	}
	const rename = renaming
		? {
				onComplete(name: string) {
					setRenaming(false)
					onRenameComplete(name)
				},
				onCancel: () => setRenaming(false),
			}
		: undefined
	return { menuProps, rename }
}

function SourceLibraryRow({
	source,
	library,
	onView,
}: {
	source: LibrarySource
	library: TLLibrary
	onView(): void
}) {
	const libraryId = library.id
	const itemCount = useValue('library item count', () => getLibraryItemCount(source, libraryId), [
		source,
		libraryId,
	])
	const previews = useValue(
		'library preview items',
		() => getLibraryPreviewItems(source, libraryId, PREVIEW_COUNT),
		[source, libraryId]
	)
	const [element, setElement] = useState<HTMLElement | null>(null)
	const urls = useLibraryThumbnailUrls(source, previews, { container: element })
	const placement = useSourcePlacement(source, libraryId)
	const { menuProps, rename } = useSourceLibraryMenu(source, library, placement)
	return (
		<BrowseRow
			rowRef={setElement}
			menuId={`libraries-browse-menu-${libraryId}`}
			name={library.name}
			itemCount={itemCount}
			thumbnailUrls={previews.map((item) => urls[item.id] ?? undefined)}
			placement={placement}
			menuProps={menuProps}
			rename={rename}
			onView={onView}
		/>
	)
}

function HostLibraryRow({ entry, onView }: { entry: LibraryBrowseEntry; onView?(): void }) {
	const editor = useEditor()
	const colorMode = useValue('color mode', () => editor.getColorMode(), [editor])
	const placement = useHostPlacement(entry)
	return (
		<BrowseRow
			menuId={`libraries-browse-menu-host-${entry.id}`}
			name={entry.name}
			itemCount={entry.itemCount}
			thumbnailUrls={entry.previews
				.slice(0, PREVIEW_COUNT)
				.map((thumbnail) => thumbnail && getThumbnailForColorMode(thumbnail, colorMode))}
			placement={placement}
			menuProps={{ onAddToDocument: placement.onAdd, onRemoveFromDocument: placement.onRemove }}
			onView={onView}
		/>
	)
}

/**
 * A library in Browse: its name and action over a strip of its first items. Right-click, a long
 * press, or the context menu key opens its menu.
 */
function BrowseRow({
	rowRef,
	menuId,
	name,
	itemCount,
	thumbnailUrls,
	placement,
	menuProps,
	rename,
	onView,
}: {
	rowRef?(element: HTMLElement | null): void
	menuId: string
	name: string
	itemCount: number
	thumbnailUrls: (string | undefined)[]
	placement: LibraryPlacement
	menuProps: Omit<LibraryMenuProps, 'id'>
	/** Set while the name is being edited. */
	rename?: { onComplete(name: string): void; onCancel(): void }
	/** Opens the library to view its items. Leave out for one that can't be. */
	onView?(): void
}) {
	const editor = useEditor()
	const msg = useTranslation()
	const holdInView = useContext(HoldInViewContext)
	const hold = (e: SyntheticEvent<HTMLElement>) => {
		if (holdInView) holdInView(e.currentTarget)
	}
	const contextMenu = getContextMenuHandlers((opener, point) =>
		openContextMenu(editor, menuId, { opener, point })
	)
	const press = useLongPress(true)(() => openContextMenu(editor, menuId))
	const overflows = itemCount > PREVIEW_COUNT
	const tileCount = overflows ? PREVIEW_COUNT - 1 : Math.min(itemCount, PREVIEW_COUNT)
	const tiles = Array.from({ length: tileCount }, (_, i) => (
		<span key={i} className="tlui-libraries-tile__thumbnail">
			{thumbnailUrls[i] && <img src={thumbnailUrls[i]} alt="" draggable={false} />}
		</span>
	))
	if (overflows) {
		const more = itemCount - tileCount
		tiles.push(
			<span
				key="more"
				className="tlui-libraries-tile__thumbnail tlui-libraries-browse__more"
				aria-label={msg(messages.moreLabel, { count: more })}
			>
				{msg(messages.more, { count: more })}
			</span>
		)
	}
	return (
		<li
			ref={rowRef}
			className="tlui-libraries-browse__row"
			data-empty={itemCount === 0 || undefined}
			onPointerDownCapture={hold}
			onFocusCapture={hold}
			{...press}
			{...contextMenu}
		>
			<div className="tlui-libraries-browse__row-title">
				{rename ? (
					<RenameInput
						className="tlui-libraries-browse__rename"
						defaultValue={name}
						onComplete={rename.onComplete}
						onCancel={rename.onCancel}
					/>
				) : (
					<>
						<span className="tlui-libraries-browse__name">{name}</span>
						<BrowseAction placement={placement} revealOnHover />
					</>
				)}
				{!rename && <LibraryMenu id={menuId} trigger="none" {...menuProps} />}
			</div>
			{itemCount === 0 && (
				<p className="tlui-libraries-browse__empty">{msg(messages.emptyLibrary)}</p>
			)}
			{itemCount > 0 && onView && (
				<button
					type="button"
					className="tlui-libraries-browse__strip tlui-libraries-browse__view"
					aria-label={msg(messages.view, { name })}
					onClick={onView}
				>
					{tiles}
				</button>
			)}
			{itemCount > 0 && !onView && (
				<div className="tlui-libraries-browse__strip" aria-hidden>
					{tiles}
				</div>
			)}
		</li>
	)
}

/**
 * "Add to file" for a library not in the file, or "Remove from file" for one that is. In a row, with
 * a pointer that hovers, it rests as a muted + or "Added ✓" until the row is hovered or focused.
 * A library the user can't remove shows "Added ✓" alone.
 */
function BrowseAction({
	placement,
	revealOnHover = false,
}: {
	placement: LibraryPlacement
	revealOnHover?: boolean
}) {
	const msg = useTranslation()
	const { added, onAdd, onRemove, busy } = placement
	const reveal = revealOnHover || undefined
	if (added && !onRemove && !busy) {
		return (
			<span className="tlui-libraries-browse__added">
				{msg(messages.added)}
				<TldrawUiIcon icon="check" label="" small />
			</span>
		)
	}
	if (added) {
		return (
			<button
				type="button"
				className="tlui-libraries-browse__action"
				data-reveal={reveal}
				aria-disabled={!onRemove}
				onClick={onRemove}
			>
				{revealOnHover && (
					<span className="tlui-libraries-browse__action-rest" aria-hidden>
						{msg(messages.added)}
						<TldrawUiIcon icon="check" label="" small />
					</span>
				)}
				<span className="tlui-libraries-browse__action-label">{msg(messages.remove)}</span>
			</button>
		)
	}
	return (
		<button
			type="button"
			className="tlui-libraries-browse__action"
			data-reveal={reveal}
			aria-disabled={!onAdd}
			onClick={onAdd}
		>
			<span className="tlui-libraries-browse__action-label">{msg(messages.add)}</span>
			<TldrawUiIcon icon="plus" label="" small />
		</button>
	)
}

interface ViewedItem {
	id: string
	name?: string
	thumbnailUrl?: string
}

/** A library opened from Browse: all its items, with its menu above and its action below. */
function LibraryView({
	name,
	items,
	itemsRef,
	placement,
	menuId,
	menuProps,
	rename,
	onBack,
}: {
	name: string
	/** Undefined while they load. */
	items: ViewedItem[] | undefined
	itemsRef?(element: HTMLElement | null): void
	placement: LibraryPlacement
	menuId: string
	menuProps: Omit<LibraryMenuProps, 'id'>
	rename?: { onComplete(name: string): void; onCancel(): void }
	onBack(): void
}) {
	const msg = useTranslation()
	const inSheet = useContext(SheetBackContext) !== undefined
	const listRef = useRef<HTMLUListElement | null>(null)
	const setListRef = useCallback(
		(element: HTMLUListElement | null) => {
			listRef.current = element
			if (itemsRef) itemsRef(element)
		},
		[itemsRef]
	)
	useLayoutEffect(() => {
		if (inSheet) return
		const content = listRef.current && listRef.current.closest('.tlui-dialog__content')
		if (content instanceof HTMLElement) content.focus()
	}, [inSheet])
	return (
		<>
			<BrowseHeader
				title={name}
				onBack={onBack}
				menu={<LibraryMenu id={menuId} {...menuProps} />}
				rename={rename}
			/>
			<TldrawUiDialogBody className="tlui-libraries-browse">
				{items && items.length === 0 ? (
					<p className="tlui-libraries-browse__empty tlui-libraries-browse__empty--view">
						{msg(messages.emptyLibrary)}
					</p>
				) : (
					<ul ref={setListRef} className="tlui-libraries-browse__items" aria-busy={!items}>
						{items &&
							items.map((item) => (
								<li key={item.id} className="tlui-libraries-browse__item">
									<TldrawUiTooltip content={item.name} side="bottom">
										<span
											className="tlui-libraries-tile__thumbnail"
											role="img"
											aria-label={item.name ?? msg(messages.unnamedItem)}
										>
											{item.thumbnailUrl && (
												<img src={item.thumbnailUrl} alt="" draggable={false} />
											)}
										</span>
									</TldrawUiTooltip>
								</li>
							))}
					</ul>
				)}
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-libraries-browse__footer">
				<BrowseAction placement={placement} />
			</TldrawUiDialogFooter>
		</>
	)
}

function SourceLibraryView({
	source,
	library,
	onBack,
}: {
	source: LibrarySource
	library: TLLibrary
	onBack(): void
}) {
	const libraryId = library.id
	const items = useValue('library items', () => source.getItems(libraryId), [source, libraryId])
	useEffect(() => {
		if (source.loadItems) source.loadItems(libraryId)
	}, [source, libraryId])
	const [element, setElement] = useState<HTMLElement | null>(null)
	const urls = useLibraryThumbnailUrls(source, items, { container: element })
	const placement = useSourcePlacement(source, libraryId)
	const { menuProps, rename } = useSourceLibraryMenu(source, library, placement)
	return (
		<LibraryView
			name={library.name}
			items={items.map((item) => ({
				id: item.id,
				name: item.name,
				thumbnailUrl: urls[item.id] ?? undefined,
			}))}
			itemsRef={setElement}
			placement={placement}
			menuId={`libraries-browse-view-menu-${libraryId}`}
			menuProps={menuProps}
			rename={rename}
			onBack={onBack}
		/>
	)
}

function HostLibraryView({ entry, onBack }: { entry: LibraryBrowseEntry; onBack(): void }) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const colorMode = useValue('color mode', () => editor.getColorMode(), [editor])
	const placement = useHostPlacement(entry)
	const [loaded, setLoaded] = useState<LibraryBrowseEntryItem[]>()
	const getItems = entry.getItems
	useEffect(() => {
		if (!getItems) return
		let cancelled = false
		getItems().then(
			(items) => {
				if (!cancelled) setLoaded(items)
			},
			() => {
				if (!cancelled) addToast({ title: msg(messages.loadErrorTitle), severity: 'error' })
			}
		)
		return () => {
			cancelled = true
		}
	}, [getItems, addToast, msg])
	const items = useMemo(
		() =>
			loaded &&
			loaded.map((item) => ({
				id: item.id,
				name: item.name,
				thumbnailUrl: item.thumbnail && getThumbnailForColorMode(item.thumbnail, colorMode),
			})),
		[loaded, colorMode]
	)
	return (
		<LibraryView
			name={entry.name}
			items={items}
			placement={placement}
			menuId={`libraries-browse-view-menu-host-${entry.id}`}
			menuProps={{ onAddToDocument: placement.onAdd, onRemoveFromDocument: placement.onRemove }}
			onBack={onBack}
		/>
	)
}
