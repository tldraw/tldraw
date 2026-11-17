import type { TLLibrary } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'

export interface PanelSections {
	/** Housed in the document or added to it, and any the source gives no placement. */
	thisFile: TLLibrary[]
	/** The user's default, shown in every document. */
	defaults: TLLibrary[]
}

/**
 * The user's default, which the panel lists first, and the libraries under "This file". Undefined for a source
 * that doesn't say why its libraries are shown, whose libraries the panel lists as they come.
 */
export function getPanelSections(
	source: LibrarySource,
	libraries: TLLibrary[]
): PanelSections | undefined {
	if (!source.getLibraryPlacement) return undefined
	const sections: PanelSections = { thisFile: [], defaults: [] }
	for (const library of libraries) {
		const placement = source.getLibraryPlacement(library.id)
		if (placement === 'default') sections.defaults.push(library)
		else sections.thisFile.push(library)
	}
	return sections
}
