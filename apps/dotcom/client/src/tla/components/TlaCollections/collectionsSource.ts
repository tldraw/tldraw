import { CollectionRecordType, InMemoryCollectionSource } from '@tldraw/collections'

// Until tldraw.com has a real source, collections live in memory for the signed-in session: every
// file opened keeps what was added, and it resets on reload.
export function createCollectionsSource() {
	return new InMemoryCollectionSource({
		id: 'dotcom-in-memory',
		initial: {
			collections: [
				CollectionRecordType.create({
					id: CollectionRecordType.createId('sample-wireframes'),
					name: 'Wireframes',
				}),
				CollectionRecordType.create({
					id: CollectionRecordType.createId('sample-icons'),
					name: 'Icons',
				}),
			],
			items: [],
			contents: {},
		},
	})
}
