import {
	copyLibrary,
	getLibraryTree,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryTreeNode,
	useLibraries,
	useLibraryCan,
	useLibraryItemDrag,
	useLibraryItems,
	useLibraryThumbnailUrls,
} from '@tldraw/libraries'
import { createContext, type CSSProperties, useContext, useMemo, useState } from 'react'
import {
	getIncrementedName,
	type TLComponents,
	Tldraw,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useDialogs,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './libraries-nested-drill-in.css'
import { source } from './sample-libraries'

// Unlisted, like /libraries: @tldraw/libraries is unreleased. A libraries panel you drill into, one
// library at a time, built from the package's hooks instead of LibrariesPanel.

const PanelContext = createContext<HTMLElement | null>(null)

function DrillInPanel() {
	const [panel, setPanel] = useState<HTMLElement | null>(null)
	const [openId, setOpenId] = useState<TLLibraryId>()
	const [query, setQuery] = useState('')
	// [1]
	const libraries = useLibraries(source)
	const tree = useMemo(() => getLibraryTree(libraries), [libraries])
	const trail = findTrail(tree, openId)
	const current = trail.at(-1)

	const open = (libraryId: TLLibraryId | undefined) => {
		setOpenId(libraryId)
		setQuery('')
	}

	return (
		<PanelContext.Provider value={panel}>
			<aside ref={setPanel} className="drill-in" onContextMenu={(e) => e.stopPropagation()}>
				<header className="drill-in__header">
					{current ? (
						<>
							<button
								type="button"
								className="drill-in__back"
								aria-label="Back"
								onClick={() => open(trail.at(-2)?.library.id)}
							>
								‹
							</button>
							{/* [2] */}
							<nav className="drill-in__breadcrumb" aria-label="Library">
								{trail.map((node, i) => (
									<span key={node.library.id}>
										{i > 0 && ' / '}
										{node === current ? (
											<span aria-current="page">{node.library.name}</span>
										) : (
											<button type="button" onClick={() => open(node.library.id)}>
												{node.library.name}
											</button>
										)}
									</span>
								))}
							</nav>
						</>
					) : (
						<h2 className="drill-in__title">Libraries</h2>
					)}
				</header>
				<input
					type="search"
					className="drill-in__search"
					value={query}
					onChange={(e) => setQuery(e.currentTarget.value)}
					placeholder={current ? 'Search in this library' : 'Search all libraries'}
				/>
				<div className="drill-in__body">
					{query.trim() !== '' ? (
						<SearchResults nodes={current ? [current] : tree} query={query} onOpen={open} />
					) : current ? (
						<LibraryView node={current} onOpen={open} />
					) : (
						<AllLibraries tree={tree} onOpen={open} />
					)}
				</div>
			</aside>
		</PanelContext.Provider>
	)
}

function AllLibraries({
	tree,
	onOpen,
}: {
	tree: TLLibraryTreeNode[]
	onOpen(libraryId: TLLibraryId): void
}) {
	return (
		<>
			<h3 className="drill-in__heading">All libraries</h3>
			{tree.map((node) => (
				<LibraryCard key={node.library.id} node={node} onOpen={onOpen} />
			))}
			<AddMoreLibraries />
		</>
	)
}

function LibraryCard({
	node,
	onOpen,
}: {
	node: TLLibraryTreeNode
	onOpen(libraryId: TLLibraryId): void
}) {
	const { previews, itemCount } = useLibrarySummary(node, 4)
	const thumbnails = useLibraryThumbnailUrls(source, previews, { width: 120 })
	return (
		<button type="button" className="drill-in__card" onClick={() => onOpen(node.library.id)}>
			<span className="drill-in__card-previews">
				{previews.map((item) => (
					<span key={item.id} className="drill-in__thumbnail">
						{thumbnails[item.id] && <img src={thumbnails[item.id]} alt="" draggable={false} />}
					</span>
				))}
			</span>
			<span className="drill-in__card-name">{node.library.name}</span>
			<span className="drill-in__detail">
				{itemCount} {itemCount === 1 ? 'item' : 'items'}
			</span>
		</button>
	)
}

function LibraryView({
	node,
	onOpen,
}: {
	node: TLLibraryTreeNode
	onOpen(libraryId: TLLibraryId): void
}) {
	const items = useLibraryItems(source, node.library.id)
	return (
		<>
			<LibraryActions node={node} onOpen={onOpen} />
			{node.children.length > 0 && (
				<ul className="drill-in__rows">
					{node.children.map((child) => (
						<li key={child.library.id}>
							<LibraryRow node={child} onOpen={onOpen} />
						</li>
					))}
				</ul>
			)}
			<ItemGrid items={items} />
		</>
	)
}

function LibraryRow({
	node,
	onOpen,
}: {
	node: TLLibraryTreeNode
	onOpen(libraryId: TLLibraryId): void
}) {
	const { previews } = useLibrarySummary(node, 1)
	const thumbnails = useLibraryThumbnailUrls(source, previews, { width: 40 })
	const preview = previews[0]
	return (
		<button type="button" className="drill-in__row" onClick={() => onOpen(node.library.id)}>
			<span className="drill-in__thumbnail">
				{preview && thumbnails[preview.id] && (
					<img src={thumbnails[preview.id]} alt="" draggable={false} />
				)}
			</span>
			<span className="drill-in__row-name">{node.library.name}</span>
			<span aria-hidden>›</span>
		</button>
	)
}

// [3]
function ItemGrid({ items }: { items: TLLibraryItem[] }) {
	const panel = useContext(PanelContext)
	const getItemProps = useLibraryItemDrag(source, { getDragRegion: () => panel })
	const thumbnails = useLibraryThumbnailUrls(source, items, { width: 120 })
	if (items.length === 0) return null
	return (
		<ul className="drill-in__grid">
			{items.map((item) => (
				<li key={item.id}>
					<button
						type="button"
						className="drill-in__tile"
						aria-label={item.name ?? 'Unnamed item'}
						{...getItemProps(item.id)}
					>
						<span className="drill-in__tile-thumbnail">
							{thumbnails[item.id] && <img src={thumbnails[item.id]} alt="" draggable={false} />}
						</span>
						<span className="drill-in__tile-name">{item.name}</span>
					</button>
				</li>
			))}
		</ul>
	)
}

function SearchResults({
	nodes,
	query,
	onOpen,
}: {
	nodes: TLLibraryTreeNode[]
	query: string
	onOpen(libraryId: TLLibraryId): void
}) {
	const normalized = query.trim().toLowerCase()
	const matches = (name: string | undefined) => !!name && name.toLowerCase().includes(normalized)
	const inScope = flatten(nodes)
	const libraryMatches = inScope.filter((node) => matches(node.library.name))
	const itemMatches = useValue(
		'matching items',
		() =>
			inScope.flatMap((node) => source.getItems(node.library.id)).filter((i) => matches(i.name)),
		[inScope, normalized]
	)
	if (libraryMatches.length === 0 && itemMatches.length === 0) {
		return <p className="drill-in__empty">No results.</p>
	}
	return (
		<>
			{libraryMatches.length > 0 && (
				<ul className="drill-in__rows">
					{libraryMatches.map((node) => (
						<li key={node.library.id}>
							<LibraryRow node={node} onOpen={onOpen} />
						</li>
					))}
				</ul>
			)}
			<ItemGrid items={itemMatches} />
		</>
	)
}

// [4]
function LibraryActions({
	node,
	onOpen,
}: {
	node: TLLibraryTreeNode
	onOpen(libraryId: TLLibraryId): void
}) {
	const { addDialog } = useDialogs()
	const canCreateInside = useLibraryCan(source, 'createLibrary', node.library.id)

	const createInside = async () => {
		const name = getIncrementedName(
			'New library',
			node.children.map((child) => child.library.name)
		)
		const library = await source.createLibrary(name, { parentId: node.library.id })
		onOpen(library.id)
	}

	const copyInto = () =>
		addDialog({
			component: ({ onClose }) => (
				<CopyIntoDialog node={node} onClose={onClose} onCopied={onOpen} />
			),
		})

	return (
		<div className="drill-in__actions">
			<button type="button" disabled={!canCreateInside} onClick={createInside}>
				New library inside
			</button>
			<button type="button" onClick={copyInto}>
				Copy into…
			</button>
		</div>
	)
}

function CopyIntoDialog({
	node,
	onClose,
	onCopied,
}: {
	node: TLLibraryTreeNode
	onClose(): void
	onCopied(libraryId: TLLibraryId): void
}) {
	const libraries = useLibraries(source)
	const destinations = useMemo(() => flatten(getLibraryTree(libraries)), [libraries])

	const copyTo = async (parentId?: TLLibraryId) => {
		onClose()
		const copy = await copyLibrary(source, node.library.id, undefined, {
			...(parentId === undefined ? {} : { parentId }),
			getName: (name) => `${name} (Copy)`,
		})
		onCopied(copy.id)
	}

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Copy “{node.library.name}” into…</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<ul className="drill-in__destinations">
					<li>
						<button type="button" onClick={() => copyTo()}>
							Top level
						</button>
					</li>
					{destinations.map(({ library, depth }) => (
						<li key={library.id}>
							<button
								type="button"
								style={{ '--drill-in-depth': depth + 1 } as CSSProperties}
								disabled={!source.can('createLibrary', library.id)}
								onClick={() => copyTo(library.id)}
							>
								{library.name}
							</button>
						</li>
					))}
				</ul>
			</TldrawUiDialogBody>
		</>
	)
}

// [5]
function AddMoreLibraries() {
	const { addDialog } = useDialogs()
	const available = useValue('available libraries', () => getAvailableTopLevel(), [])
	return (
		<button
			type="button"
			className="drill-in__add-more"
			disabled={available.length === 0}
			onClick={() => addDialog({ component: AddLibrariesDialog })}
		>
			Add more libraries
		</button>
	)
}

function AddLibrariesDialog({ onClose }: { onClose(): void }) {
	const available = useValue('available libraries', () => getAvailableTopLevel(), [])
	const add = async (libraryId: TLLibraryId) => {
		if (source.addLibraryToDocument) await source.addLibraryToDocument(libraryId)
		if (available.length === 1) onClose()
	}
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Add more libraries</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<ul className="drill-in__destinations">
					{available.map((library) => (
						<li key={library.id}>
							<button type="button" onClick={() => add(library.id)}>
								Add {library.name}
							</button>
						</li>
					))}
				</ul>
			</TldrawUiDialogBody>
		</>
	)
}

function getAvailableTopLevel() {
	if (!source.getAvailableLibraries) return []
	return source.getAvailableLibraries().filter((library) => library.parentId === undefined)
}

function useLibrarySummary(node: TLLibraryTreeNode, previewCount: number) {
	return useValue(
		'library summary',
		() => {
			const items = flatten([node]).flatMap((each) => source.getItems(each.library.id))
			return { previews: items.slice(0, previewCount), itemCount: items.length }
		},
		[node, previewCount]
	)
}

function flatten(nodes: TLLibraryTreeNode[]): TLLibraryTreeNode[] {
	return nodes.flatMap((node) => [node, ...flatten(node.children)])
}

function findTrail(
	nodes: TLLibraryTreeNode[],
	libraryId: TLLibraryId | undefined
): TLLibraryTreeNode[] {
	if (libraryId === undefined) return []
	for (const node of nodes) {
		if (node.library.id === libraryId) return [node]
		const below = findTrail(node.children, libraryId)
		if (below.length > 0) return [node, ...below]
	}
	return []
}

const components: TLComponents = {
	InFrontOfTheCanvas: DrillInPanel,
}

export default function LibrariesNestedDrillIn() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="libraries-nested-drill-in" components={components} />
		</div>
	)
}

/*
[1]
A source lists libraries flat, each inside another naming it as its `parentId`. `getLibraryTree`
arranges them as trees, each node holding its library, its depth and the nodes inside it. The panel
keeps only the id of the library it has open, and finds the trail down to it in the tree on every
render, so a library deleted or moved elsewhere drops the panel back to the top level.

[2]
The breadcrumb is the trail from the top level down to the open library. Each library above the
open one goes back up to it; the back button goes up one level.

[3]
`useLibraryItemDrag` gives each tile the props the stock panel's tiles have: a click places the item
in the middle of the viewport, and dragging it out of the panel places it under the pointer.
`getDragRegion` says which element the pointer has to leave before a press becomes a drag.

[4]
The SDK has no menu for nesting: these actions call the source. `createLibrary` takes a `parentId`
to create a library inside another, and the source says whether it may with
`can('createLibrary', parentId)`. `copyLibrary` copies a library with everything inside it, to the
top level or inside the library given as `parentId`.

[5]
Only top-level libraries are added to a document. The source lists the libraries it could add, with
the libraries inside them, so the dialog offers the top-level ones.
*/
