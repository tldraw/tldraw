import {
	type ReactNode,
	useCallback,
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
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiIcon,
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
import { getThumbnailForColorMode } from '../lib/schema'
import { getBrowseSections } from './browse-groups'
import { activeLibraryId } from './state'
import { useLibraryThumbnailUrls } from './use-library-thumbnail-urls'

const PREVIEW_COUNT = 6

const messages = defineMessages({
	title: { id: 'libraries.browse.title', defaultMessage: 'Browse libraries' },
	thisFile: { id: 'libraries.browse.this-file', defaultMessage: 'In this file' },
	ownerLibraries: { id: 'libraries.browse.owner', defaultMessage: '{name} libraries' },
	otherLibraries: { id: 'libraries.browse.other', defaultMessage: 'Other libraries' },
	empty: { id: 'libraries.browse.empty', defaultMessage: 'No libraries to add.' },
	itemCount: {
		id: 'libraries.browse.item-count',
		defaultMessage: '{count, plural, one {# item} other {# items}}',
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
	remove: { id: 'libraries.browse.remove', defaultMessage: 'Remove' },
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
	/** Thumbnails of a few of its items. The first six are shown. */
	previews: (TLLibraryThumbnail | undefined)[]
	/**
	 * Whether the document already shows it: listed under "In this file" as "Added", and can't be
	 * added again.
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
}

export function BrowseLibrariesDialog({
	source,
	getBrowseGroups: getHostGroups,
}: BrowseLibrariesDialogProps) {
	const msg = useTranslation()
	const sections = useValue(
		'browse sections',
		() => getBrowseSections(source, getHostGroups ? getHostGroups() : []),
		[source, getHostGroups]
	)
	const isEmpty =
		sections.thisFile.length === 0 && sections.owners.length === 0 && sections.hosts.length === 0
	const [viewing, setViewing] = useState<Viewing | null>(null)
	const back = () => setViewing(null)
	const viewHost = (entry: LibraryBrowseEntry) =>
		entry.getItems ? () => setViewing({ kind: 'host', entryId: entry.id }) : undefined

	if (viewing?.kind === 'source') {
		const addedLibrary = sections.thisFile.find(
			(listed) => listed.kind === 'source' && listed.library.id === viewing.libraryId
		)
		const available = sections.owners
			.flatMap((group) => group.libraries)
			.find((library) => library.id === viewing.libraryId)
		const library = addedLibrary?.kind === 'source' ? addedLibrary.library : available
		if (library) {
			return (
				<SourceLibraryView
					source={source}
					library={library}
					added={addedLibrary !== undefined}
					onBack={back}
				/>
			)
		}
	}
	if (viewing?.kind === 'host') {
		const entry = [
			...sections.thisFile.flatMap((listed) => (listed.kind === 'host' ? [listed.entry] : [])),
			...sections.hosts.flatMap((group) => group.entries),
		].find((e) => e.id === viewing.entryId)
		if (entry) return <HostLibraryView entry={entry} onBack={back} />
	}

	return (
		<>
			<BrowseHeader title={msg(messages.title)} />
			<TldrawUiDialogBody className="tlui-libraries-browse">
				{isEmpty && <p className="tlui-libraries-panel__empty">{msg(messages.empty)}</p>}
				{sections.thisFile.length > 0 && (
					<BrowseGroup label={msg(messages.thisFile)}>
						{sections.thisFile.map((listed) =>
							listed.kind === 'source' ? (
								<SourceLibraryCard
									key={listed.library.id}
									source={source}
									library={listed.library}
									added
									onView={() => setViewing({ kind: 'source', libraryId: listed.library.id })}
								/>
							) : (
								<HostLibraryCard
									key={`host:${listed.entry.id}`}
									entry={listed.entry}
									onView={viewHost(listed.entry)}
								/>
							)
						)}
					</BrowseGroup>
				)}
				{sections.owners.map((group) => (
					<BrowseGroup
						key={group.ownerId ?? ''}
						label={
							group.ownerName === undefined
								? msg(messages.otherLibraries)
								: msg(messages.ownerLibraries, { name: group.ownerName })
						}
					>
						{group.libraries.map((library) => (
							<SourceLibraryCard
								key={library.id}
								source={source}
								library={library}
								added={false}
								onView={() => setViewing({ kind: 'source', libraryId: library.id })}
							/>
						))}
					</BrowseGroup>
				))}
				{sections.hosts.map((group) => (
					<BrowseGroup key={group.id} label={group.label}>
						{group.entries.map((entry) => (
							<HostLibraryCard key={entry.id} entry={entry} onView={viewHost(entry)} />
						))}
					</BrowseGroup>
				))}
			</TldrawUiDialogBody>
		</>
	)
}

/** A Browse view's title, after a Back button where there's somewhere to go back to. */
function BrowseHeader({ title, onBack }: { title: string; onBack?(): void }) {
	const msg = useTranslation()
	const dir = useDirection()
	return (
		<TldrawUiDialogHeader className="tlui-libraries-browse__header">
			{onBack && (
				<TldrawUiButton
					type="icon"
					className="tlui-libraries-browse__back"
					onClick={onBack}
					tooltip={msg(messages.back)}
					title={msg(messages.back)}
				>
					<TldrawUiButtonIcon icon={dir === 'rtl' ? 'chevron-right' : 'chevron-left'} small />
				</TldrawUiButton>
			)}
			<TldrawUiDialogTitle>{title}</TldrawUiDialogTitle>
			<TldrawUiDialogCloseButton />
		</TldrawUiDialogHeader>
	)
}

function BrowseGroup({ label, children }: { label: string; children: ReactNode }) {
	return (
		<section className="tlui-libraries-browse__group" aria-label={label}>
			<h3 className="tlui-libraries-panel__group-label">{label}</h3>
			<ul className="tlui-libraries-browse__cards">{children}</ul>
		</section>
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

function useSourceRemove(source: LibrarySource, libraryId: TLLibraryId, added: boolean) {
	const canRemove = useValue(
		'can remove library',
		() => !!source.removeLibraryFromDocument && source.can('removeLibraryFromDocument', libraryId),
		[source, libraryId]
	)
	return useRemove(
		added && canRemove
			? async () => {
					if (!source.removeLibraryFromDocument) {
						throw new Error(`Source ${source.id} can't remove libraries`)
					}
					await source.removeLibraryFromDocument(libraryId)
				}
			: undefined
	)
}

function useSourceAdd(source: LibrarySource, library: TLLibrary, added: boolean) {
	const libraryId = library.id
	const canAdd = useValue('can add library', () => source.can('addLibraryToDocument', libraryId), [
		source,
		libraryId,
	])
	const { adding, run } = useAdd(async () => {
		if (!source.addLibraryToDocument) throw new Error(`Source ${source.id} can't add libraries`)
		await source.addLibraryToDocument(libraryId)
		return libraryId
	})
	return { disabled: added || adding || !canAdd, run }
}

function SourceLibraryCard({
	source,
	library,
	added,
	onView,
}: {
	source: LibrarySource
	library: TLLibrary
	added: boolean
	onView(): void
}) {
	const libraryId = library.id
	const items = useValue('library items', () => source.getItems(libraryId), [source, libraryId])
	const previews = items.slice(0, PREVIEW_COUNT)
	const [element, setElement] = useState<HTMLElement | null>(null)
	const urls = useLibraryThumbnailUrls(source, previews, { container: element })
	const { disabled, run } = useSourceAdd(source, library, added)
	const remove = useSourceRemove(source, libraryId, added)
	return (
		<LibraryCard
			cardRef={setElement}
			name={library.name}
			itemCount={items.length}
			thumbnailUrls={previews.map((item) => urls[item.id] ?? undefined)}
			added={added}
			disabled={disabled}
			onAdd={run}
			removing={remove.removing}
			onRemove={remove.run}
			onView={onView}
		/>
	)
}

function HostLibraryCard({ entry, onView }: { entry: LibraryBrowseEntry; onView?(): void }) {
	const editor = useEditor()
	const colorMode = useValue('color mode', () => editor.getColorMode(), [editor])
	const { adding, run } = useAdd(entry.add)
	const remove = useRemove(entry.added ? entry.remove : undefined)
	return (
		<LibraryCard
			name={entry.name}
			itemCount={entry.itemCount}
			thumbnailUrls={entry.previews
				.slice(0, PREVIEW_COUNT)
				.map((thumbnail) => thumbnail && getThumbnailForColorMode(thumbnail, colorMode))}
			added={entry.added}
			disabled={entry.added || adding || !entry.canAdd}
			onAdd={run}
			removing={remove.removing}
			onRemove={remove.run}
			onView={onView}
		/>
	)
}

function LibraryCard({
	cardRef,
	name,
	itemCount,
	thumbnailUrls,
	added,
	disabled,
	onAdd,
	removing,
	onRemove,
	onView,
}: {
	cardRef?(element: HTMLElement | null): void
	name: string
	itemCount: number
	thumbnailUrls: (string | undefined)[]
	added: boolean
	disabled: boolean
	onAdd(): void
	removing: boolean
	onRemove?(): void
	/** Opens the library to view its items. Leave out for one that can't be. */
	onView?(): void
}) {
	const msg = useTranslation()
	const thumbnails = Array.from({ length: PREVIEW_COUNT }, (_, i) => (
		<span key={i} className="tlui-libraries-tile__thumbnail">
			{thumbnailUrls[i] && <img src={thumbnailUrls[i]} alt="" draggable={false} />}
		</span>
	))
	return (
		<li ref={cardRef} className="tlui-libraries-browse__card">
			{onView ? (
				<button
					type="button"
					className="tlui-libraries-browse__thumbnails tlui-libraries-browse__view"
					aria-label={msg(messages.view, { name })}
					onClick={onView}
				>
					{thumbnails}
				</button>
			) : (
				<div className="tlui-libraries-browse__thumbnails" aria-hidden>
					{thumbnails}
				</div>
			)}
			<LibrarySummary
				name={name}
				itemCount={itemCount}
				added={added}
				disabled={disabled}
				onAdd={onAdd}
				removing={removing}
				onRemove={onRemove}
			/>
		</li>
	)
}

function LibrarySummary({
	name,
	itemCount,
	added,
	disabled,
	onAdd,
	removing,
	onRemove,
}: {
	/** Leave out where the name is already shown, as in a library's view. */
	name?: string
	itemCount: number
	added: boolean
	disabled: boolean
	onAdd(): void
	removing: boolean
	/** Removes it from the document. Leave out for one that isn't added or can't be removed. */
	onRemove?(): void
}) {
	const msg = useTranslation()
	return (
		<div className="tlui-libraries-browse__footer">
			<div className="tlui-libraries-browse__text">
				{name !== undefined && <span className="tlui-libraries-browse__name">{name}</span>}
				<span className="tlui-libraries-browse__detail">
					{msg(messages.itemCount, { count: itemCount })}
				</span>
			</div>
			<div className="tlui-libraries-browse__actions">
				{added && onRemove ? (
					<>
						<span className="tlui-libraries-browse__added">
							<TldrawUiIcon icon="check" label="" small />
							{msg(messages.added)}
						</span>
						<TldrawUiButton type="normal" disabled={removing} onClick={onRemove}>
							<TldrawUiButtonLabel>{msg(messages.remove)}</TldrawUiButtonLabel>
						</TldrawUiButton>
					</>
				) : (
					<TldrawUiButton type={added ? 'normal' : 'primary'} disabled={disabled} onClick={onAdd}>
						{added && <TldrawUiButtonIcon icon="check" small />}
						<TldrawUiButtonLabel>{msg(added ? messages.added : messages.add)}</TldrawUiButtonLabel>
					</TldrawUiButton>
				)}
			</div>
		</div>
	)
}

interface ViewedItem {
	id: string
	name?: string
	thumbnailUrl?: string
}

/** A library opened from Browse: all its items, under the same "Add to file" as its card. */
function LibraryView({
	name,
	itemCount,
	items,
	itemsRef,
	added,
	disabled,
	onAdd,
	removing,
	onRemove,
	onBack,
}: {
	name: string
	itemCount: number
	/** Undefined while they load. */
	items: ViewedItem[] | undefined
	itemsRef?(element: HTMLElement | null): void
	added: boolean
	disabled: boolean
	onAdd(): void
	removing: boolean
	onRemove?(): void
	onBack(): void
}) {
	const msg = useTranslation()
	const listRef = useRef<HTMLUListElement | null>(null)
	const setListRef = useCallback(
		(element: HTMLUListElement | null) => {
			listRef.current = element
			if (itemsRef) itemsRef(element)
		},
		[itemsRef]
	)
	useLayoutEffect(() => {
		const content = listRef.current && listRef.current.closest('.tlui-dialog__content')
		if (content instanceof HTMLElement) content.focus()
	}, [])
	return (
		<>
			<BrowseHeader title={name} onBack={onBack} />
			<TldrawUiDialogBody className="tlui-libraries-browse">
				<LibrarySummary
					itemCount={itemCount}
					added={added}
					disabled={disabled}
					onAdd={onAdd}
					removing={removing}
					onRemove={onRemove}
				/>
				<ul ref={setListRef} className="tlui-libraries-browse__items" aria-busy={!items}>
					{items &&
						items.map((item) => (
							<li key={item.id} className="tlui-libraries-browse__item">
								<span className="tlui-libraries-tile__thumbnail">
									{item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" draggable={false} />}
								</span>
								<span className="tlui-libraries-browse__item-name">
									{item.name ?? msg(messages.unnamedItem)}
								</span>
							</li>
						))}
				</ul>
			</TldrawUiDialogBody>
		</>
	)
}

function SourceLibraryView({
	source,
	library,
	added,
	onBack,
}: {
	source: LibrarySource
	library: TLLibrary
	added: boolean
	onBack(): void
}) {
	const libraryId = library.id
	const items = useValue('library items', () => source.getItems(libraryId), [source, libraryId])
	const [element, setElement] = useState<HTMLElement | null>(null)
	const urls = useLibraryThumbnailUrls(source, items, { container: element })
	const { disabled, run } = useSourceAdd(source, library, added)
	const remove = useSourceRemove(source, libraryId, added)
	return (
		<LibraryView
			name={library.name}
			itemCount={items.length}
			items={items.map((item) => ({
				id: item.id,
				name: item.name,
				thumbnailUrl: urls[item.id] ?? undefined,
			}))}
			itemsRef={setElement}
			added={added}
			disabled={disabled}
			onAdd={run}
			removing={remove.removing}
			onRemove={remove.run}
			onBack={onBack}
		/>
	)
}

function HostLibraryView({ entry, onBack }: { entry: LibraryBrowseEntry; onBack(): void }) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const colorMode = useValue('color mode', () => editor.getColorMode(), [editor])
	const { adding, run } = useAdd(entry.add)
	const remove = useRemove(entry.added ? entry.remove : undefined)
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
			itemCount={entry.itemCount}
			items={items}
			added={entry.added}
			disabled={entry.added || adding || !entry.canAdd}
			onAdd={run}
			removing={remove.removing}
			onRemove={remove.run}
			onBack={onBack}
		/>
	)
}
