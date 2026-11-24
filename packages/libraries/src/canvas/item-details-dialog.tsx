import { useEffect, useMemo, useRef, useState } from 'react'
import {
	defineMessages,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useTranslation,
	useValue,
	type TLLibrary,
	type TLLibraryId,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibraryItem } from '../lib/schema'
import { ItemMenu } from '../ui/item-menu'
import { RenameInput } from '../ui/rename-input'
import { useLibraryCan } from './use-library-can'
import { useLibraryItemActions } from './use-library-item-actions'
import { useLibraryThumbnailUrls } from './use-library-thumbnail-urls'

const messages = defineMessages({
	title: { id: 'libraries.item-details.title', defaultMessage: 'Details' },
	unnamedItem: { id: 'libraries.unnamed-item', defaultMessage: 'Unnamed item' },
	name: { id: 'libraries.item-details.name', defaultMessage: 'Name' },
	library: { id: 'libraries.item-details.library', defaultMessage: 'Library' },
	created: { id: 'libraries.item-details.created', defaultMessage: 'Created on' },
	createdOn: { id: 'libraries.item-details.saved-on', defaultMessage: '{date, date, medium}' },
	createdBy: { id: 'libraries.item-details.created-by', defaultMessage: 'Created by' },
})

export interface ItemDetailsDialogProps {
	source: LibrarySource
	item: TLLibraryItem
	library: TLLibrary
	onClose(): void
}

/** An item's preview and facts, with a menu to rename, move, copy or delete it. */
export function ItemDetailsDialog({
	source,
	item: initialItem,
	library,
	onClose,
}: ItemDetailsDialogProps) {
	const msg = useTranslation()
	const libraryId = initialItem.libraryId
	const current = useValue(
		'item details item',
		() => source.getItems(libraryId).find((i) => i.id === initialItem.id),
		[source, libraryId, initialItem.id]
	)
	const item = current ?? initialItem
	const shown = useRef(current !== undefined)
	useEffect(() => {
		if (current) shown.current = true
		else if (shown.current) onClose()
	}, [current, onClose])
	const details = useValue(
		'item details',
		() => (source.getItemDetails ? source.getItemDetails(item) : {}),
		[source, item]
	)
	const canRename = useLibraryCan(source, 'updateItem', libraryId)
	const canDelete = useLibraryCan(source, 'deleteItem', libraryId)
	const { rename, move, copy, requestDelete, moveTargets, copyTargets } = useLibraryItemActions(
		source,
		libraryId
	)
	const [renaming, setRenaming] = useState(false)
	const [element, setElement] = useState<HTMLElement | null>(null)
	const items = useMemo(() => [item], [item])
	const thumbnailUrl = useLibraryThumbnailUrls(source, items, { container: element })[item.id]
	const name = item.name ?? msg(messages.unnamedItem)

	return (
		<>
			<TldrawUiDialogHeader className="tlui-libraries-details__header">
				<TldrawUiDialogTitle>{msg(messages.title)}</TldrawUiDialogTitle>
				{!renaming && (
					<ItemMenu
						id={`${item.id}-details`}
						onRename={canRename ? () => setRenaming(true) : undefined}
						moveTargets={moveTargets}
						onMove={(toLibraryId) => move(item.id, toLibraryId as TLLibraryId)}
						copyTargets={copyTargets}
						onCopy={(toLibraryId) => copy(item.id, toLibraryId as TLLibraryId)}
						onDelete={canDelete ? () => requestDelete(item.id) : undefined}
					/>
				)}
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className="tlui-libraries-details">
				<div ref={setElement}>
					<span className="tlui-libraries-tile__thumbnail tlui-libraries-details__thumbnail">
						{thumbnailUrl && <img src={thumbnailUrl} alt="" draggable={false} />}
					</span>
				</div>
				{details.description && (
					<p className="tlui-libraries-details__description">{details.description}</p>
				)}
				<dl className="tlui-libraries-details__facts">
					<dt>{msg(messages.name)}</dt>
					<dd>
						{renaming && (
							<RenameInput
								className="tlui-libraries-details__rename"
								defaultValue={item.name ?? ''}
								onComplete={(newName) => {
									setRenaming(false)
									rename(item.id, newName)
								}}
								onCancel={() => setRenaming(false)}
							/>
						)}
						{!renaming && canRename && (
							<button
								type="button"
								className="tlui-libraries-details__name"
								onClick={() => setRenaming(true)}
							>
								{name}
							</button>
						)}
						{!renaming && !canRename && name}
					</dd>
					<dt>{msg(messages.library)}</dt>
					<dd>{library.name}</dd>
					{item.createdAt !== undefined && (
						<>
							<dt>{msg(messages.created)}</dt>
							<dd>{msg(messages.createdOn, { date: item.createdAt })}</dd>
						</>
					)}
					{details.creatorName && (
						<>
							<dt>{msg(messages.createdBy)}</dt>
							<dd>{details.creatorName}</dd>
						</>
					)}
				</dl>
			</TldrawUiDialogBody>
		</>
	)
}
