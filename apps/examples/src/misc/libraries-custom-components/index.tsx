import { Editor } from 'tldraw'
import { LibrariesExample, type Showing } from '../libraries-example'
import { customPieces } from './custom-pieces'
import { extraActions } from './extra-actions'
import { listLayout } from './list-layout'
import { readOnlyGallery } from './read-only-gallery'
import { richTiles } from './rich-tiles'
import './libraries-custom-components.css'

// Unlisted, like /develop: @tldraw/libraries is unreleased. Each page of the document shows the
// panel with a different set of LibrariesComponents.

const SHOWINGS = {
	'Read-only gallery': readOnlyGallery,
	'Rich tiles': richTiles,
	'List layout': listLayout,
	'Extra actions': extraActions,
	'Custom pieces': customPieces,
} satisfies Record<string, Showing>

type PageName = keyof typeof SHOWINGS

const PAGES = Object.keys(SHOWINGS) as PageName[]

const getShowing = (editor: Editor): Showing =>
	SHOWINGS[editor.getCurrentPage().name as PageName] ?? readOnlyGallery

export default function LibrariesCustomComponents() {
	return (
		<LibrariesExample
			persistenceKey="libraries-custom-components-showcase"
			pages={PAGES}
			getShowing={getShowing}
		/>
	)
}
