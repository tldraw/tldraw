import type { TLLibrary } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { LibraryBrowseEntry, LibraryBrowseGroup } from './browse-libraries-dialog'

export interface PanelSections {
	/** Housed in the document or added to it, and any the source gives no placement. */
	thisFile: TLLibrary[]
	/** The document's own, which "This file" starts with. */
	document: TLLibrary[]
	/** The user's default, shown in every document. */
	defaults: TLLibrary[]
}

/**
 * The user's default, which the panel lists first, and the libraries under "This file": the
 * document's own, then the rest. Undefined for a source that doesn't say why its libraries are
 * shown, whose libraries the panel lists as they come.
 */
export function getPanelSections(
	source: LibrarySource,
	libraries: TLLibrary[]
): PanelSections | undefined {
	if (!source.getLibraryPlacement) return undefined
	const sections: PanelSections = { thisFile: [], document: [], defaults: [] }
	for (const library of libraries) {
		const placement = source.getLibraryPlacement(library.id)
		if (placement === 'default') sections.defaults.push(library)
		else if (placement === 'document') sections.document.push(library)
		else sections.thisFile.push(library)
	}
	return sections
}

/** How many of the host's browse entries an empty "This file" offers. */
export const EMPTY_THIS_FILE_OFFER_COUNT = 3

/**
 * The host's browse entries an empty "This file" offers to add, such as starter packs: the first
 * few not yet added that can be. None while "This file" has libraries besides the document's own,
 * or for a source whose libraries have no placement, which has no "This file".
 */
export function getEmptyThisFileOffers(
	sections: PanelSections | undefined,
	groups: LibraryBrowseGroup[]
): LibraryBrowseEntry[] {
	if (!sections || sections.thisFile.length > 0) return []
	return groups
		.flatMap((group) => group.entries)
		.filter((entry) => !entry.added && entry.canAdd)
		.slice(0, EMPTY_THIS_FILE_OFFER_COUNT)
}
