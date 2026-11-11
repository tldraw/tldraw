import { LibrariesExample } from './libraries-example'
import { getShowing, PAGES } from './libraries-pages'

// Unlisted, like /develop: @tldraw/libraries is unreleased. Each page of the document shows the
// panel over a different LibrarySource.

export default function Libraries() {
	return (
		<LibrariesExample persistenceKey="libraries-sources" pages={PAGES} getShowing={getShowing} />
	)
}
