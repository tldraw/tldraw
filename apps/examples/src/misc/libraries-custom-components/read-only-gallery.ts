import type { LibrariesComponents } from '@tldraw/libraries'
import type { Showing } from '../libraries-example'
import { PACKS, packSource } from './pack-source'

const components: LibrariesComponents = {
	LibrariesPanelHeader: null,
	AddSelectionTile: null,
	ItemMenu: null,
	LibraryMenu: null,
}

export const readOnlyGallery: Showing = {
	source: packSource('showcase-gallery', [PACKS.wireframing, PACKS.tldrawCharacters]),
	components,
}
