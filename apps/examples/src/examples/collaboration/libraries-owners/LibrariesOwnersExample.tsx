import {
	AddToLibraryMenuItem,
	BoardIcon,
	CompositeLibrarySource,
	InMemoryLibrarySource,
	LibrariesPanel,
	librariesPanelOpen,
	LibrariesQuickActions,
} from '@tldraw/libraries'
import { DefaultContextMenu, DefaultContextMenuContent, TLComponents, Tldraw } from 'tldraw'
import '@tldraw/libraries/libraries.css'
import 'tldraw/tldraw.css'
import { ArchiveIcon, HomeIcon, PeopleIcon } from '../../../libraries-fixtures/owner-icons'
import { PACKS, packSource } from '../../../libraries-fixtures/packs'

// [1]
const source = new CompositeLibrarySource({
	id: 'libraries-owners',
	defaultOwnerId: 'personal',
	parts: [
		{
			owner: { id: 'board', name: 'This board', icon: <BoardIcon /> },
			source: new InMemoryLibrarySource({ id: 'libraries-owners-board' }),
		},
		{
			owner: { id: 'personal', name: 'Private to you', icon: <HomeIcon /> },
			source: new InMemoryLibrarySource({ id: 'libraries-owners-personal' }),
		},
		{
			owner: { id: 'shared', name: 'Shared', icon: <PeopleIcon /> },
			source: packSource('libraries-owners-shared', [PACKS.wireframing]),
		},
		{
			owner: { id: 'design-team', name: 'Design team', icon: <PeopleIcon /> },
			source: packSource('libraries-owners-design-team', [PACKS.diagramming]),
		},
		{
			owner: { id: 'packs', name: 'Packs', icon: <ArchiveIcon /> },
			// [2]
			source: packSource('libraries-owners-packs', [PACKS.tldrawCharacters], { can: () => false }),
		},
	],
})

const components: TLComponents = {
	InFrontOfTheCanvas: () => <LibrariesPanel source={source} />,
	QuickActions: LibrariesQuickActions,
	ContextMenu: (props) => (
		<DefaultContextMenu {...props}>
			<AddToLibraryMenuItem source={source} />
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	),
}

export default function LibrariesOwnersExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					librariesPanelOpen.set(editor, true)
				}}
			/>
		</div>
	)
}

/*
[1]
`CompositeLibrarySource` joins several sources into one, each under an owner. The panel shows a
tab per owner, and "New library" in its header creates one for the active tab's owner. Other new
libraries go to `defaultOwnerId`. In a real app each part would be backed by a different store: the
board, the user's account, a team.

[2]
`can` decides what the user may do with a source. Refusing everything makes it read-only: its
items can be placed, but nothing in it can be changed.
*/
