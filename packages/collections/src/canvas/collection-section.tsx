import type { ButtonHTMLAttributes } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	useDialogs,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollection, TLCollectionItemId } from '../lib/schema'
import { CollectionMenu } from '../ui/collection-menu'
import { RenameInput } from '../ui/rename-input'
import { CollectionItems } from './collection-items'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { getItemOrderChoice, itemOrderings, setItemOrderChoice } from './item-order'
import { collapsedCollectionIds, renamingCollectionId } from './state'

const messages = defineMessages({
	expand: { id: 'collections.section.expand', defaultMessage: 'Show items' },
	collapse: { id: 'collections.section.collapse', defaultMessage: 'Hide items' },
	deleteTitle: {
		id: 'collections.delete-collection-dialog.title',
		defaultMessage: 'Delete collection',
	},
	deleteBody: {
		id: 'collections.delete-collection-dialog.body',
		defaultMessage:
			'Delete “{name}” and its {count, plural, one {# item} other {# items}}? Copies already placed on canvases stay.',
	},
	changeErrorTitle: {
		id: 'collections.collection-error.title',
		defaultMessage: "Couldn't change collections",
	},
	changeErrorDescription: {
		id: 'collections.collection-error.description',
		defaultMessage: 'You may not be allowed to, or the collection no longer exists.',
	},
})

export interface CollectionSectionProps {
	source: CollectionSource
	collection: TLCollection
	/** Props for an item's tile button: its click and drag handlers. */
	getItemProps(itemId: TLCollectionItemId): ButtonHTMLAttributes<HTMLButtonElement>
	/** How many rows of items show before "Show all". */
	rows: number
}

/**
 * One collection as a section of the panel: a header that folds it shut, renames it and holds its
 * menu, over its items.
 */
export function CollectionSection({
	source,
	collection,
	getItemProps,
	rows,
}: CollectionSectionProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const collectionId = collection.id
	const collapsed = useValue(
		'collection collapsed',
		() => collapsedCollectionIds.get(editor).includes(collectionId),
		[editor, collectionId]
	)
	const renaming = useValue(
		'renaming collection',
		() => renamingCollectionId.get(editor) === collectionId,
		[editor, collectionId]
	)
	const can = useValue(
		'collection permissions',
		() => ({
			rename: source.can('renameCollection', collectionId),
			delete: source.can('deleteCollection', collectionId),
		}),
		[source, collectionId]
	)
	const orderChoice = useValue('item order', () => getItemOrderChoice(source.id, collectionId), [
		source,
		collectionId,
	])
	// A stored choice that matches no ordering falls back to the default.
	const ordering = itemOrderings.find((o) => o.id === orderChoice.orderingId) ?? itemOrderings[0]
	const sort = {
		options: itemOrderings.map(({ id, label }) => ({ id, label })),
		value: ordering.id,
		onValueChange: (orderingId: string) =>
			setItemOrderChoice(source.id, collectionId, { ...orderChoice, orderingId }),
		reversed: orderChoice.reversed,
		onReversedChange: (reversed: boolean) =>
			setItemOrderChoice(source.id, collectionId, { ...orderChoice, reversed }),
	}

	const toggleCollapsed = () =>
		collapsedCollectionIds.update(editor, (ids) =>
			collapsed ? ids.filter((id) => id !== collectionId) : [...ids, collectionId]
		)
	const stopRenaming = () => renamingCollectionId.set(editor, null)

	const showError = () =>
		addToast({
			title: msg(messages.changeErrorTitle),
			description: msg(messages.changeErrorDescription),
			severity: 'error',
		})

	const renameCollection = (name: string) => {
		stopRenaming()
		const trimmed = name.trim()
		// Collection names are never blank, so clearing the input keeps the old name.
		if (trimmed === '' || trimmed === collection.name) return
		source.renameCollection(collectionId, trimmed).catch(showError)
	}

	const deleteCollection = () => {
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDeleteDialog
					title={msg(messages.deleteTitle)}
					body={msg(messages.deleteBody, {
						name: collection.name,
						count: source.getItems(collectionId).length,
					})}
					onClose={onClose}
					onConfirm={() => source.deleteCollection(collectionId).catch(showError)}
				/>
			),
		})
	}

	return (
		<section className="tlui-collections-section" data-collection-id={collectionId}>
			<header className="tlui-collections-panel__header">
				<TldrawUiButton
					type="icon"
					className="tlui-collections-section__toggle"
					tooltip={msg(collapsed ? messages.expand : messages.collapse)}
					title={msg(collapsed ? messages.expand : messages.collapse)}
					aria-expanded={!collapsed}
					onClick={toggleCollapsed}
				>
					<TldrawUiButtonIcon icon={collapsed ? 'chevron-right' : 'chevron-down'} small />
				</TldrawUiButton>
				{renaming ? (
					<RenameInput
						className="tlui-collections-panel__rename"
						defaultValue={collection.name}
						onComplete={renameCollection}
						onCancel={stopRenaming}
					/>
				) : (
					<span className="tlui-collections-section__name">{collection.name}</span>
				)}
				<div className="tlui-collections-panel__header-actions">
					{/* Hidden while renaming: a closing menu hands focus back to its trigger, which would blur
					    the input straight away. */}
					{!renaming && (
						<CollectionMenu
							id={`collections-collection-menu-${collectionId}`}
							onRename={
								can.rename ? () => renamingCollectionId.set(editor, collectionId) : undefined
							}
							onDelete={can.delete ? deleteCollection : undefined}
							sort={sort}
						/>
					)}
				</div>
			</header>
			{!collapsed && (
				<CollectionItems
					source={source}
					collectionId={collectionId}
					getItemProps={getItemProps}
					ordering={ordering}
					reversed={orderChoice.reversed}
					maxRows={rows}
				/>
			)}
		</section>
	)
}
