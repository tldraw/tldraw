import { CollectionsExample } from './collections-example'
import { getShowing, PAGES } from './collections-pages'

// Unlisted, like /develop: @tldraw/collections is unreleased. Each page of the document shows the
// panel over a different CollectionSource.

export default function Collections() {
	return (
		<CollectionsExample
			persistenceKey="collections-sources"
			pages={PAGES}
			getShowing={getShowing}
		/>
	)
}
