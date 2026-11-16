import {
	getToolbarLibraryIds,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
	LibrariesToolbarItems,
	LibraryStampPreview,
	LibraryStampTool,
	putLibraryInToolbar,
} from '@tldraw/libraries'
import {
	ArrowToolbarItem,
	AssetToolbarItem,
	DefaultToolbar,
	DrawToolbarItem,
	type Editor,
	EraserToolbarItem,
	FrameToolbarItem,
	getFromLocalStorage,
	HandToolbarItem,
	HighlightToolbarItem,
	LaserToolbarItem,
	LineToolbarItem,
	NoteToolbarItem,
	SelectToolbarItem,
	setInLocalStorage,
	TextToolbarItem,
	type TLComponents,
	Tldraw,
} from 'tldraw'
import { BASIC_SHAPES_ID, STAMPS_ID, ToolbarExampleLibrarySource } from './libraries-toolbar-source'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'

// Unlisted, like /libraries: @tldraw/libraries is unreleased. The toolbar's geo tools come from the
// Basic shapes library, put in the toolbar like any other; pick a Stamps item, then click or drag on
// the canvas to place copies of it.

const source = new ToolbarExampleLibrarySource()

// Both libraries start in the toolbar, until the user first changes what's there.
const STARTED_KEY = 'libraries-toolbar-example-started'
if (getFromLocalStorage(STARTED_KEY) === null) {
	setInLocalStorage(STARTED_KEY, 'true')
	if (getToolbarLibraryIds(source).length === 0) {
		putLibraryInToolbar(source, BASIC_SHAPES_ID)
		putLibraryInToolbar(source, STAMPS_ID)
	}
}

const tools = [LibraryStampTool]

const components: TLComponents = {
	Toolbar: () => (
		<DefaultToolbar>
			<SelectToolbarItem />
			<HandToolbarItem />
			<DrawToolbarItem />
			<EraserToolbarItem />
			<ArrowToolbarItem />
			<TextToolbarItem />
			<NoteToolbarItem />
			<AssetToolbarItem />
			<LibrariesToolbarItems source={source} />
			<LineToolbarItem />
			<HighlightToolbarItem />
			<LaserToolbarItem />
			<FrameToolbarItem />
		</DefaultToolbar>
	),
	InFrontOfTheCanvas: () => (
		<>
			<LibraryStampPreview />
			<LibrariesPanel source={source} canPutInToolbar />
		</>
	),
	QuickActions: LibrariesQuickActions,
}

let seeded: Promise<void> | undefined

function handleMount(editor: Editor) {
	librariesPanelOpen.set(editor, true)
	seeded ??= source
		.seed(editor)
		.catch((error) => console.error('[libraries] seeding the toolbar example failed', error))
}

export default function LibrariesToolbar() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="libraries-toolbar"
				tools={tools}
				components={components}
				onMount={handleMount}
			/>
		</div>
	)
}
