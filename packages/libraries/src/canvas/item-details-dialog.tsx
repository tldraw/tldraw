import { useMemo, useState } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useTranslation,
	useValue,
	type TLLibrary,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibraryItem } from '../lib/schema'
import { useLibraryThumbnailUrls } from './use-library-thumbnail-urls'

const messages = defineMessages({
	unnamedItem: { id: 'libraries.unnamed-item', defaultMessage: 'Unnamed item' },
	library: { id: 'libraries.item-details.library', defaultMessage: 'Library' },
	saved: { id: 'libraries.item-details.saved', defaultMessage: 'Saved' },
	savedOn: { id: 'libraries.item-details.saved-on', defaultMessage: '{date, date, medium}' },
	savedBy: { id: 'libraries.item-details.saved-by', defaultMessage: 'Saved by' },
	place: { id: 'libraries.item-details.place', defaultMessage: 'Place' },
})

export interface ItemDetailsDialogProps {
	source: LibrarySource
	item: TLLibraryItem
	library: TLLibrary
	onPlace(): void
	onClose(): void
}

export function ItemDetailsDialog({
	source,
	item: initialItem,
	library,
	onPlace,
	onClose,
}: ItemDetailsDialogProps) {
	const msg = useTranslation()
	const item = useValue(
		'item details item',
		() =>
			source.getItems(initialItem.libraryId).find((i) => i.id === initialItem.id) ?? initialItem,
		[source, initialItem]
	)
	const details = useValue(
		'item details',
		() => (source.getItemDetails ? source.getItemDetails(item) : {}),
		[source, item]
	)
	const [element, setElement] = useState<HTMLElement | null>(null)
	const items = useMemo(() => [item], [item])
	const thumbnailUrl = useLibraryThumbnailUrls(source, items, { container: element })[item.id]

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{item.name ?? msg(messages.unnamedItem)}</TldrawUiDialogTitle>
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
					<dt>{msg(messages.library)}</dt>
					<dd>{library.name}</dd>
					{item.createdAt !== undefined && (
						<>
							<dt>{msg(messages.saved)}</dt>
							<dd>{msg(messages.savedOn, { date: item.createdAt })}</dd>
						</>
					)}
					{details.creatorName && (
						<>
							<dt>{msg(messages.savedBy)}</dt>
							<dd>{details.creatorName}</dd>
						</>
					)}
				</dl>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton
					type="primary"
					onClick={() => {
						onPlace()
						onClose()
					}}
				>
					<TldrawUiButtonLabel>{msg(messages.place)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
