import {
	CollectionsPanel,
	CollectionRecordType,
	CollectionsPanelButton,
	collectionsPanelOpen,
	InMemoryCollectionSource,
} from '@tldraw/collections'
import { DefaultPageMenu, Editor, TLComponents, Tldraw } from 'tldraw'
import '@tldraw/collections/collections.css'
import 'tldraw/tldraw.css'

// Unlisted, like /develop: @tldraw/collections is unreleased, so this page is for building its UI
// against an in-memory source without the tldraw.com stack.
const source = new InMemoryCollectionSource({
	initial: {
		collections: [
			CollectionRecordType.create({ id: CollectionRecordType.createId('wireframes'), name: 'Wireframes' }),
			CollectionRecordType.create({ id: CollectionRecordType.createId('icons'), name: 'Icons' }),
		],
		items: [],
		contents: {},
	},
})

const components: TLComponents = {
	InFrontOfTheCanvas: () => <CollectionsPanel source={source} />,
	PageMenu: () => (
		<>
			<DefaultPageMenu />
			<CollectionsPanelButton />
		</>
	),
}

const handleMount = (editor: Editor) => {
	collectionsPanelOpen.set(editor, true)
}

export default function Collections() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="collections"
				components={components}
				onMount={handleMount}
			/>
		</div>
	)
}
