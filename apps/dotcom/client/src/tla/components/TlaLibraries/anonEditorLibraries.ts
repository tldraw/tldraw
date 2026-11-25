import {
	BoardLibrarySource,
	collapsedLibraryIds,
	CompositeLibrarySource,
	type LibrarySource,
} from '@tldraw/libraries'
import { defineMessages, type Editor, type TLI18nMessage, type TLRecord } from 'tldraw'
import { ReadOnlyLibraryView } from './readOnlyLibrarySource'
import { STARTER_PACK_IDS } from './starterPacks'
import { getStarterPackLibraryId, StarterPacksLibrarySource } from './starterPacksLibrarySource'

const messages = defineMessages({
	thisBoard: { defaultMessage: 'This board' },
	publicLibraries: { defaultMessage: 'Public libraries' },
})

export interface AnonEditorLibraries {
	source: LibrarySource
	starterPacks: StarterPacksLibrarySource
}

const sources = new WeakMap<Editor, AnonEditorLibraries>()

function hasBoardLibraries(editor: Editor) {
	return !!editor.store.schema.types['library' as TLRecord['typeName']]
}

/**
 * The libraries a signed-out visitor's editor offers, read-only: the board's own, when its document
 * holds libraries, then the starter packs. Made once per editor, with the packs folded shut, so that
 * each is fetched only once it's unfolded.
 */
export function getAnonEditorLibraries(
	editor: Editor,
	msg: (message: TLI18nMessage) => string
): AnonEditorLibraries {
	const existing = sources.get(editor)
	if (existing) return existing
	const starterPacks = new StarterPacksLibrarySource()
	const packLibraryIds = STARTER_PACK_IDS.map(getStarterPackLibraryId)
	collapsedLibraryIds.update(editor, (ids) => [
		...ids,
		...packLibraryIds.filter((id) => !ids.includes(id)),
	])
	const source = hasBoardLibraries(editor)
		? new CompositeLibrarySource({
				id: 'anon',
				parts: [
					{
						owner: { id: 'board', name: msg(messages.thisBoard) },
						source: new ReadOnlyLibraryView(new BoardLibrarySource(editor)),
					},
					{
						owner: { id: 'starter-packs', name: msg(messages.publicLibraries) },
						source: starterPacks,
					},
				],
			})
		: starterPacks
	const libraries = { source, starterPacks }
	sources.set(editor, libraries)
	return libraries
}
