import {
	CollectionRecordType,
	InMemoryCollectionSource,
	type CollectionSource,
} from '@tldraw/collections'

// Until tldraw.com has a real source, every editor in the tab shares one in-memory source, so
// opening another file keeps what was added this session. It resets on reload.
let source: CollectionSource | null = null

export function getCollectionsSource(enabled: boolean): CollectionSource | null {
	if (!enabled) return null
	source ??= new InMemoryCollectionSource({
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
	return source
}
