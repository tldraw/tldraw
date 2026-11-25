import {
	type LibrariesComponents,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
} from '@tldraw/libraries'
import { TLComponents, Tldraw } from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'
import { PACKS, packSource } from '../../../libraries-fixtures/packs'

const source = packSource('libraries-gallery', [PACKS.wireframing, PACKS.tldrawCharacters])

// [1]
const librariesComponents: LibrariesComponents = {
	LibrariesPanelHeader: null,
	AddSelectionTile: null,
	ItemMenu: null,
	LibraryMenu: null,
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => <LibrariesPanel source={source} components={librariesComponents} />,
	QuickActions: LibrariesQuickActions,
}

export default function LibrariesGalleryExample() {
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
`LibrariesPanel` takes `components` to replace or hide its pieces. Setting a piece to `null` hides
it: here the header, the + tile and the menus, which leaves a gallery to place items from.
*/
