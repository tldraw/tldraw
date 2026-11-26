import {
	ItemTile,
	type ItemTileProps,
	type LibrariesComponents,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
	type TLLibraryItem,
} from '@tldraw/libraries'
import { TLComponents, Tldraw } from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'
import { PACKS, packSource } from '../../../libraries-fixtures/packs'
import './libraries-custom-tiles.css'

// [1]
const source = packSource('libraries-custom-tiles', [PACKS.wireframing, PACKS.diagramming], {
	itemFields: (_item, index) => ({ meta: { isNew: index < 2 } }),
})

// [2]
function CaptionedItemTile(props: ItemTileProps & { item: TLLibraryItem }) {
	const { item } = props
	return (
		<div className="libraries-custom-tile">
			<ItemTile {...props} />
			{item.meta.isNew === true && <span className="libraries-custom-tile__badge">New</span>}
			<span className="libraries-custom-tile__caption">{item.name ?? 'Unnamed'}</span>
		</div>
	)
}

const librariesComponents: LibrariesComponents = { ItemTile: CaptionedItemTile }

const components: TLComponents = {
	InFrontOfTheCanvas: () => <LibrariesPanel source={source} components={librariesComponents} />,
	QuickActions: LibrariesQuickActions,
}

export default function LibrariesCustomTilesExample() {
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
Items carry a `meta` object for the host's own data. Here the first two items in each library are
marked as new.

[2]
An `ItemTile` override gets the item and everything the default tile needs. Rendering the default
`ItemTile` inside it keeps the thumbnail, dragging and the item's menu, and adds a badge and a
caption around them.
*/
