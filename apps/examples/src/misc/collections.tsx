import { Editor } from 'tldraw'
import { CollectionsExample } from './collections-example'
import { getShowing, PAGES, seedBoard } from './collections-pages'

// Unlisted, like /develop: @tldraw/collections is unreleased. Each page of the document shows the
// panel over a different CollectionSource. /collections-stress loads the panel with many or no
// items.

const handleMount = (editor: Editor) => {
	seedBoard(editor).catch((error) => console.error('[collections] seeding the board failed', error))
}

export default function Collections() {
	return (
		<CollectionsExample
			persistenceKey="collections-sources"
			pages={PAGES}
			getShowing={getShowing}
			onMount={handleMount}
		/>
	)
}
