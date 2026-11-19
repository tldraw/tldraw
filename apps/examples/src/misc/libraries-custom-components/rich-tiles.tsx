import {
	ItemTile,
	type ItemTileProps,
	type LibrariesComponents,
	type TLLibraryItem,
} from '@tldraw/libraries'
import type { Showing } from '../libraries-example'
import { PACKS, packSource } from './pack-source'

function RichItemTile(props: ItemTileProps & { item: TLLibraryItem }) {
	const { item } = props
	return (
		<div className="libraries-showcase-rich-tile">
			<ItemTile {...props} />
			{item.meta.isNew === true && <span className="libraries-showcase-badge">New</span>}
			<span className="libraries-showcase-caption">{item.name ?? 'Unnamed'}</span>
		</div>
	)
}

const components: LibrariesComponents = { ItemTile: RichItemTile }

export const richTiles: Showing = {
	source: packSource('showcase-rich-tiles', [PACKS.wireframing, PACKS.diagramming], {
		itemFields: (_item, index) => ({ meta: { isNew: index < 2 } }),
	}),
	components,
}
