import { CompositeCollectionSource, PackCollectionSource } from '@tldraw/collections'
import type { TldrawAppCollectionsSource } from './collectionsSource'
import { STARTER_PACKS } from './starterPacks'

/**
 * The user's collections, then the starter packs bundled with tldraw.com, read-only under a
 * "tldraw" owner. Packs can be copied into the user's own owners.
 */
export class TldrawAppCollectionsWithPacks extends CompositeCollectionSource {
	constructor(private readonly browser: TldrawAppCollectionsSource) {
		super({
			// The browser source's id, so choices the UI keeps per source carry over.
			id: browser.id,
			parts: [
				{ source: browser },
				{
					owner: { id: 'tldraw', name: 'tldraw' },
					source: new PackCollectionSource({ packs: STARTER_PACKS }),
				},
			],
		})
	}

	setOpenFileId(fileId: string | undefined) {
		this.browser.setOpenFileId(fileId)
	}

	dispose() {
		this.browser.dispose()
	}
}
