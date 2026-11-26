import {
	AddToLibraryMenuItem,
	CommandPaletteLibrariesGroup,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
} from '@tldraw/libraries'
import {
	DefaultCommandPalette,
	DefaultCommandPaletteContent,
	DefaultContextMenu,
	DefaultContextMenuContent,
	TLComponents,
	Tldraw,
} from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'
import { PACKS, packSource } from '../../../libraries-fixtures/packs'

// [1]
const source = packSource('libraries', [PACKS.wireframing, PACKS.diagramming])

// [2]
const components: TLComponents = {
	InFrontOfTheCanvas: () => <LibrariesPanel source={source} />,
	QuickActions: LibrariesQuickActions,
	ContextMenu: (props) => (
		<DefaultContextMenu {...props}>
			<AddToLibraryMenuItem source={source} />
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	),
	CommandPalette: (props) => (
		<DefaultCommandPalette {...props}>
			<CommandPaletteLibrariesGroup source={source} />
			<DefaultCommandPaletteContent />
		</DefaultCommandPalette>
	),
}

export default function LibrariesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					// [3]
					librariesPanelOpen.set(editor, true)
				}}
			/>
		</div>
	)
}

/*
[1]
A `LibrarySource` is where libraries and their items come from. `InMemoryLibrarySource` keeps them
in memory; `packSource` fills one with a library per pack.

[2]
The panel in front of the canvas, "Add to library" in the context menu and the libraries group in
the command palette all read the same source. `LibrariesQuickActions` adds the button that opens
and closes the panel.

[3]
The panel shows while the `librariesPanelOpen` editor atom is set.
*/
