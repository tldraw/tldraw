import type { ReactNode } from 'react'
import {
	defineMessages,
	getIncrementedName,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { LibraryMenu } from '../ui/library-menu'
import { canCreateNewLibrary, createNewLibrary } from './new-library'
import { activeLibraryId, renamingLibraryId } from './state'

const messages = defineMessages({
	title: { id: 'collections.title', defaultMessage: 'Collections' },
	newLibraryName: { id: 'collections.new-collection-name', defaultMessage: 'New collection' },
	changeErrorTitle: {
		id: 'collections.collection-error.title',
		defaultMessage: "Couldn't change collections",
	},
	changeErrorDescription: {
		id: 'collections.collection-error.description',
		defaultMessage: 'You may not be allowed to, or the collection no longer exists.',
	},
})

export function LibrariesPanelHeader({
	source,
	menuItems,
}: {
	source: LibrarySource
	menuItems?: ReactNode
}) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const canCreate = useValue('can create library', () => canCreateNewLibrary(source), [source])
	const renaming = useValue('renaming library', () => renamingLibraryId.get(editor) !== null, [
		editor,
	])

	const createLibrary = () => {
		const name = getIncrementedName(
			msg(messages.newLibraryName),
			source.getLibraries().map((library) => library.name)
		)
		createNewLibrary(source, name).then(
			(library) => {
				activeLibraryId.set(editor, library.id)
				renamingLibraryId.set(editor, library.id)
			},
			() =>
				addToast({
					title: msg(messages.changeErrorTitle),
					description: msg(messages.changeErrorDescription),
					severity: 'error',
				})
		)
	}

	return (
		<header className="tlui-libraries-panel__header">
			<span className="tlui-libraries-panel__title">{msg(messages.title)}</span>
			<div className="tlui-libraries-panel__header-actions">
				{/* Hidden while renaming: a closing menu hands focus back to its trigger, which would blur
				    the new library's name input straight away. */}
				{!renaming && (
					<LibraryMenu id="libraries-panel-menu" onCreate={canCreate ? createLibrary : undefined}>
						{menuItems}
					</LibraryMenu>
				)}
			</div>
		</header>
	)
}
