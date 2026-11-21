import {
	defaultPlaceLibraryItem,
	InMemoryLibrarySource,
	type LibraryItemPlacer,
	type LibrarySource,
	type TLLibrary,
	useLibraries,
	useLibraryCan,
	useLibraryCollapsed,
	useLibraryItemDrag,
	useLibraryItems,
	useLibraryThumbnailUrls,
	useSaveSelectionToLibrary,
} from '@tldraw/libraries'
import { useEffect, useState } from 'react'
import { Editor, TLComponents, Tldraw, useEditor, useValue } from 'tldraw'
import { saveSamples, shapeSample, WIREFRAMES } from '../libraries-samples'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'
import './libraries-custom-layout.css'

// Unlisted, like /libraries: @tldraw/libraries is unreleased. The libraries are laid out as a tray
// along the bottom of the canvas, built from the package's hooks instead of LibrariesPanel.

const source = new InMemoryLibrarySource({ id: 'libraries-custom-layout' })

let seeding: Promise<void> | undefined

function seed(editor: Editor) {
	seeding ??= (async () => {
		const pieces = await source.createLibrary('Pieces')
		await saveSamples(
			editor,
			source,
			pieces.id,
			Array.from({ length: 6 }, (_, i) => shapeSample(i))
		)
		const boards = await source.createLibrary('Boards')
		await saveSamples(editor, source, boards.id, WIREFRAMES)
	})().catch((error) => console.error('[libraries] seeding the tray failed', error))
}

const placePiece: LibraryItemPlacer = (editor, placement) => {
	const ids = defaultPlaceLibraryItem(editor, { ...placement, select: false })
	const library = source.getLibraries().find((l) => l.id === placement.item.libraryId)
	if (library?.name === 'Boards') editor.sendToBack(ids)
	return ids
}

function Tray() {
	const editor = useEditor()
	const [tray, setTray] = useState<HTMLElement | null>(null)
	const libraries = useLibraries(source)
	useEffect(() => seed(editor), [editor])

	return (
		<aside ref={setTray} className="libraries-tray" onContextMenu={(e) => e.stopPropagation()}>
			{libraries.map((library) => (
				<Shelf key={library.id} source={source} library={library} tray={tray} />
			))}
		</aside>
	)
}

function Shelf({
	source,
	library,
	tray,
}: {
	source: LibrarySource
	library: TLLibrary
	tray: HTMLElement | null
}) {
	const editor = useEditor()
	const [collapsed, setCollapsed] = useLibraryCollapsed(library.id)
	const items = useLibraryItems(source, library.id, { ordering: 'name' })
	const thumbnails = useLibraryThumbnailUrls(source, items, { width: 56 })
	const canAdd = useLibraryCan(source, 'addItem', library.id)
	const { saveSelection } = useSaveSelectionToLibrary(source)
	const getItemProps = useLibraryItemDrag(source, {
		placeItem: placePiece,
		getDragRegion: () => tray,
	})
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])

	return (
		<section className="libraries-tray__shelf">
			<button
				type="button"
				className="libraries-tray__name"
				aria-expanded={!collapsed}
				onClick={() => setCollapsed(!collapsed)}
			>
				{library.name}
			</button>
			{!collapsed && (
				<div className="libraries-tray__pieces">
					{items.map((item) => (
						<button
							key={item.id}
							type="button"
							className="libraries-tray__piece"
							aria-label={item.name ?? 'Unnamed piece'}
							{...getItemProps(item.id)}
						>
							{thumbnails[item.id] && <img src={thumbnails[item.id]} alt="" draggable={false} />}
						</button>
					))}
					{canAdd && (
						<button
							type="button"
							className="libraries-tray__add"
							disabled={!hasSelection}
							onClick={() => saveSelection(library.id)}
						>
							Add selection
						</button>
					)}
				</div>
			)}
		</section>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: Tray,
}

export default function LibrariesCustomLayout() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="libraries-custom-layout" components={components} />
		</div>
	)
}
