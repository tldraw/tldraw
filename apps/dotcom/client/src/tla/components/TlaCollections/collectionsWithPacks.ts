import {
	CompositeCollectionSource,
	localStorageAddedPackIds,
	PackCollectionSource,
} from '@tldraw/collections'
import type { TldrawAppCollectionsSource } from './collectionsSource'
import { STARTER_PACKS } from './starterPacks'

/**
 * The user's collections, then the starter packs bundled with tldraw.com that the user has added,
 * read-only under a "tldraw" owner. Packs can be copied into the user's own owners.
 *
 * Which packs are added is kept in this browser, per user. As a real preference it would live with
 * the user's other settings on the server, so it follows them between devices.
 */
export class TldrawAppCollectionsWithPacks extends CompositeCollectionSource {
	/** The packs on offer, for the panel's "Browse collections…". */
	readonly packs: PackCollectionSource

	constructor(
		private readonly browser: TldrawAppCollectionsSource,
		userId: string
	) {
		const packs = new PackCollectionSource({
			packs: STARTER_PACKS,
			addedPackIds: localStorageAddedPackIds(`tldraw-collections-added-packs:${userId}`),
		})
		super({
			// The browser source's id, so choices the UI keeps per source carry over.
			id: browser.id,
			parts: [{ source: browser }, { owner: { id: 'tldraw', name: 'tldraw' }, source: packs }],
		})
		this.packs = packs
	}

	dispose() {
		this.browser.dispose()
	}
}
