import {
	defineMessages,
	TldrawUiIcon,
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import { copyLibrary } from '../lib/copyLibrary'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibrary } from '../lib/schema'
import { LibraryMenu, type LibraryMenuSort } from '../ui/library-menu'
import { RenameInput } from '../ui/rename-input'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { getOwnerChoices } from './owner-choices'
import { renamingLibraryId } from './state'

const messages = defineMessages({
	deleteTitle: {
		id: 'collections.delete-collection-dialog.title',
		defaultMessage: 'Delete collection',
	},
	deleteBody: {
		id: 'collections.delete-collection-dialog.body',
		defaultMessage:
			'Delete “{name}” and its {count, plural, one {# item} other {# items}}? Copies already placed on canvases stay.',
	},
	movedTitle: { id: 'collections.moved.title', defaultMessage: 'Moved' },
	movedDescription: { id: 'collections.moved.description', defaultMessage: 'Moved to {name}.' },
	copiedTitle: { id: 'collections.copied.title', defaultMessage: 'Copied' },
	copiedDescription: { id: 'collections.copied.description', defaultMessage: 'Copied to {name}.' },
	changeErrorTitle: {
		id: 'collections.collection-error.title',
		defaultMessage: "Couldn't change collections",
	},
	changeErrorDescription: {
		id: 'collections.collection-error.description',
		defaultMessage: 'You may not be allowed to, or the collection no longer exists.',
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
		}),
		[source, libraryId]
	)
	const ownerChoices = useValue(
		'library owner choices',
		() => getOwnerChoices(source, library.ownerId),
		[source, library.ownerId]
	)

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
		const count = source.getItems(libraryId).length
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDeleteDialog
					title={msg(messages.deleteTitle)}
					body={msg(messages.deleteBody, { name: library.name, count })}
					onClose={onClose}
					onConfirm={() => source.deleteLibrary(libraryId).catch(showError)}
				/>
			),
		})
	}

	const moveLibrary = (ownerId: string) => {
		if (!source.moveLibrary) return
		const owner = ownerChoices.move.find((o) => o.id === ownerId)
		source.moveLibrary(libraryId, ownerId).then(
			() =>
				addToast({
					title: msg(messages.movedTitle),
					description: owner && msg(messages.movedDescription, { name: owner.name }),
				}),
			showError
		)
	}

	const copyToOwner = (ownerId: string) => {
		const owner = ownerChoices.copy.find((o) => o.id === ownerId)
		copyLibrary(source, libraryId, ownerId).then(
			() =>
				addToast({
					title: msg(messages.copiedTitle),
					description: owner && msg(messages.copiedDescription, { name: owner.name }),
				}),
			showError
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
					<TldrawUiIcon icon="chevron-down" label="" small className="tlui-libraries-chevron" />
				</button>
			)}
			<div className="tlui-libraries-panel__header-actions">
				{/* Hidden while renaming: a closing menu hands focus back to its trigger, which would blur
				    the input straight away. */}
				{!renaming && (
					<LibraryMenu
						id={`libraries-library-menu-${libraryId}`}
						onRename={can.rename ? () => renamingLibraryId.set(editor, libraryId) : undefined}
						onDelete={can.delete ? deleteLibrary : undefined}
						sort={sort}
						move={
							source.moveLibrary && can.delete && ownerChoices.move.length > 0
								? {
										owners: ownerChoices.move,
										value: library.ownerId,
										onValueChange: moveLibrary,
									}
								: undefined
						}
						copy={
							ownerChoices.copy.length > 0
								? { owners: ownerChoices.copy, onSelect: copyToOwner }
								: undefined
						}
					/>
				)}
			</div>
		</header>
	)
}
