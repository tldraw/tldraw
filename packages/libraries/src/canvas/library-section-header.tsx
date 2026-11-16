import {
	defineMessages,
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
	type TLLibrary,
} from 'tldraw'
import { copyLibrary } from '../lib/copyLibrary'
import type { LibrarySource } from '../lib/LibrarySource'
import { getLibraryDescendants } from '../lib/libraryTree'
import { ChevronDownStrongIcon } from '../ui/chevron-down-strong-icon'
import { LibraryMenu, type LibraryMenuSort } from '../ui/library-menu'
import { RenameInput } from '../ui/rename-input'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { getLibraryDestinations, type LibraryDestinationChoice } from './library-destinations'
import { activeLibraryId, collapsedLibraryIds, renamingLibraryId } from './state'
import { useCreateLibrary } from './use-create-library'

const messages = defineMessages({
	deleteTitle: {
		id: 'libraries.delete-library-dialog.title',
		defaultMessage: 'Delete library',
	},
	deleteBody: {
		id: 'libraries.delete-library-dialog.body',
		defaultMessage:
			'Delete “{name}” and its {count, plural, one {# item} other {# items}}? Copies already placed on canvases stay.',
	},
	deleteNestedBody: {
		id: 'libraries.delete-nested-library-dialog.body',
		defaultMessage:
			'Delete “{name}”, the {libraries, plural, one {# library} other {# libraries}} inside it, and their {count, plural, one {# item} other {# items}}? Copies already placed on canvases stay.',
	},
	topLevel: { id: 'libraries.library-menu.top-level', defaultMessage: 'Top level' },
	movedTitle: { id: 'libraries.moved.title', defaultMessage: 'Moved' },
	movedDescription: { id: 'libraries.moved.description', defaultMessage: 'Moved to {name}.' },
	copiedTitle: { id: 'libraries.copied.title', defaultMessage: 'Copied' },
	copiedDescription: { id: 'libraries.copied.description', defaultMessage: 'Copied to {name}.' },
	changeErrorTitle: {
		id: 'libraries.library-error.title',
		defaultMessage: "Couldn't change libraries",
	},
	changeErrorDescription: {
		id: 'libraries.library-error.description',
		defaultMessage: 'You may not be allowed to, or the library no longer exists.',
	},
})

export interface LibrarySectionHeaderProps {
	source: LibrarySource
	library: TLLibrary
	collapsed: boolean
	onToggleCollapsed(): void
	sort: LibraryMenuSort
}

export function LibrarySectionHeader({
	source,
	library,
	collapsed,
	onToggleCollapsed,
	sort,
}: LibrarySectionHeaderProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const libraryId = library.id
	const renaming = useValue('renaming library', () => renamingLibraryId.get(editor) === libraryId, [
		editor,
		libraryId,
	])
	const stopRenaming = () => renamingLibraryId.set(editor, null)

	const can = useValue(
		'library permissions',
		() => ({
			rename: source.can('renameLibrary', libraryId),
			delete: source.can('deleteLibrary', libraryId),
			createInside: source.can('createLibrary', libraryId),
		}),
		[source, libraryId]
	)
	const createLibrary = useCreateLibrary(source)
	const destinations = useValue(
		'library destinations',
		() => ({
			move:
				source.moveLibrary && source.can('deleteLibrary', libraryId)
					? getLibraryDestinations(source, library, 'move')
					: [],
			copy: getLibraryDestinations(source, library, 'copy'),
		}),
		[source, library, libraryId]
	)
	const destinationName = (choice: LibraryDestinationChoice) =>
		choice.label ?? msg(messages.topLevel)

	const showError = () =>
		addToast({
			title: msg(messages.changeErrorTitle),
			description: msg(messages.changeErrorDescription),
			severity: 'error',
		})

	const renameLibrary = (name: string) => {
		stopRenaming()
		const trimmed = name.trim()
		// Library names are never blank, so clearing the input keeps the old name.
		if (trimmed === '' || trimmed === library.name) return
		source.renameLibrary(libraryId, trimmed).catch(showError)
	}

	const deleteLibrary = () => {
		const inside = getLibraryDescendants(source.getLibraries(), libraryId)
		const count = [library, ...inside].reduce((sum, c) => sum + source.getItems(c.id).length, 0)
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDeleteDialog
					title={msg(messages.deleteTitle)}
					body={
						inside.length > 0
							? msg(messages.deleteNestedBody, {
									name: library.name,
									libraries: inside.length,
									count,
								})
							: msg(messages.deleteBody, { name: library.name, count })
					}
					onClose={onClose}
					onConfirm={() => source.deleteLibrary(libraryId).catch(showError)}
				/>
			),
		})
	}

	const moveLibrary = (key: string) => {
		const choice = destinations.move.find((c) => c.key === key)
		if (!source.moveLibrary || !choice) return
		source.moveLibrary(libraryId, choice.destination).then((moved) => {
			activeLibraryId.set(editor, moved.id)
			addToast({
				title: msg(messages.movedTitle),
				description: msg(messages.movedDescription, { name: destinationName(choice) }),
			})
		}, showError)
	}

	const copyTo = (key: string) => {
		const choice = destinations.copy.find((c) => c.key === key)
		if (!choice) return
		copyLibrary(source, libraryId, choice.destination).then((copy) => {
			activeLibraryId.set(editor, copy.id)
			addToast({
				title: msg(messages.copiedTitle),
				description: msg(messages.copiedDescription, { name: destinationName(choice) }),
			})
		}, showError)
	}

	// Waits for the menu to close: it hands focus back to its trigger, which would blur the new
	// library's name input straight away.
	const createInside = () => {
		collapsedLibraryIds.update(editor, (ids) => ids.filter((id) => id !== libraryId))
		editor.timers.requestAnimationFrame(() =>
			editor.timers.requestAnimationFrame(() => createLibrary({ parentId: libraryId }))
		)
	}

	return (
		<header className="tlui-libraries-panel__header">
			{renaming ? (
				<RenameInput
					className="tlui-libraries-panel__rename"
					defaultValue={library.name}
					onComplete={renameLibrary}
					onCancel={stopRenaming}
				/>
			) : (
				<button
					type="button"
					className="tlui-libraries-panel__title tlui-libraries-panel__toggle"
					aria-expanded={!collapsed}
					onClick={onToggleCollapsed}
				>
					<span className="tlui-libraries-panel__name">{library.name}</span>
					<ChevronDownStrongIcon className="tlui-libraries-chevron" />
				</button>
			)}
			<div className="tlui-libraries-panel__header-actions">
				{/* Hidden while renaming: a closing menu hands focus back to its trigger, which would blur
				    the input straight away. */}
				{!renaming && (
					<LibraryMenu
						id={`libraries-library-menu-${libraryId}`}
						onCreateInside={can.createInside ? createInside : undefined}
						onRename={can.rename ? () => renamingLibraryId.set(editor, libraryId) : undefined}
						onDelete={can.delete ? deleteLibrary : undefined}
						sort={sort}
						move={
							destinations.move.length > 0
								? { destinations: destinations.move, onSelect: moveLibrary }
								: undefined
						}
						copy={
							destinations.copy.length > 0
								? { destinations: destinations.copy, onSelect: copyTo }
								: undefined
						}
					/>
				)}
			</div>
		</header>
	)
}
