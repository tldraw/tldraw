import {
	AddToLibraryMenuItem,
	copyPack,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
	LibraryMenuItem,
	type LibraryPack,
} from '@tldraw/libraries'
import { DefaultContextMenu, DefaultContextMenuContent, TLComponents, Tldraw } from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'
import { PACKS } from '../../../libraries-fixtures/packs'
import { LocalStorageLibrarySource } from './local-storage-library-source'

// [1]
const source = new LocalStorageLibrarySource('libraries-local', 'libraries-example-local')

// [2]
function AddPackMenuItems() {
	const addPack = (pack: LibraryPack) =>
		copyPack(source, pack).catch((error) =>
			console.error(`[libraries] adding the ${pack.name} pack failed`, error)
		)
	return Object.values(PACKS).map((pack) => (
		<LibraryMenuItem key={pack.id} label={`Add ${pack.name}`} onClick={() => addPack(pack)} />
	))
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => <LibrariesPanel source={source} menuItems={<AddPackMenuItems />} />,
	QuickActions: LibrariesQuickActions,
	ContextMenu: (props) => (
		<DefaultContextMenu {...props}>
			<AddToLibraryMenuItem source={source} />
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	),
}

export default function LibrariesLocalStorageExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					librariesPanelOpen.set(editor, true)
				}}
			/>
		</div>
	)
}

/*
[1]
`LocalStorageLibrarySource` is written outside the SDK, against the `LibrarySource` interface. See
local-storage-library-source.ts.

[2]
`menuItems` adds the host's own items to the panel's ⋯ menu. `copyPack` copies a pack into a new
library in the source.
*/
