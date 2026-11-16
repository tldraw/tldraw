import { Popover as _Popover } from 'radix-ui'
import { useCallback, useEffect, useState } from 'react'
import {
	defineMessages,
	TldrawUiButtonIcon,
	TldrawUiToolbar,
	TldrawUiToolbarButton,
	type TLLibrary,
	type TLLibraryItemId,
	useContainer,
	useEditor,
	useMenuIsOpen,
	useTranslation,
	useUniqueSafeId,
	useValue,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibraryItem } from '../lib/schema'
import { LibraryIcon } from '../ui/library-icon'
import { isLibraryItemArmed } from './arm-item'
import { getToolbarLibraryIds } from './toolbar-libraries'
import { type ItemPick, useItemDrag } from './use-item-drag'
import { usePickItem } from './use-pick-item'
import { useThumbnailUrls } from './use-thumbnail-urls'

const messages = defineMessages({
	unnamedItem: { id: 'libraries.unnamed-item', defaultMessage: 'Unnamed item' },
})

function ItemIcon({
	source,
	item,
	thumbnailUrl,
}: {
	source: LibrarySource
	item: TLLibraryItem | undefined
	thumbnailUrl: string | null | undefined
}) {
	const icon = item && source.getItemTool?.(item.id)?.icon
	if (icon) return <TldrawUiButtonIcon icon={icon} />
	if (!item) return <TldrawUiButtonIcon icon={<LibraryIcon />} />
	return (
		<span className="tlui-libraries-toolbar-item__thumbnail">
			{thumbnailUrl && <img src={thumbnailUrl} alt="" draggable={false} />}
		</span>
	)
}

function ToolbarLibrary({ source, library }: { source: LibrarySource; library: TLLibrary }) {
	const editor = useEditor()
	const msg = useTranslation()
	const container = useContainer()
	const popoverId = `libraries-toolbar-${useUniqueSafeId()}`
	const [isOpen, handleOpenChange] = useMenuIsOpen(popoverId)
	const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null)
	const [grid, setGrid] = useState<HTMLDivElement | null>(null)

	const items = useValue('toolbar library items', () => source.getItems(library.id), [
		source,
		library.id,
	])
	const armedItemId = useValue(
		'armed toolbar library item',
		() => items.find((item) => isLibraryItemArmed(editor, source, item.id))?.id,
		[editor, source, items]
	)
	// The trigger shows the item last armed from this library, as a toolbar's overflow shows the
	// last tool used from it.
	const [lastArmedId, setLastArmedId] = useState<TLLibraryItemId>()
	useEffect(() => {
		if (armedItemId) setLastArmedId(armedItemId)
	}, [armedItemId])
	const shownItem = items.find((item) => item.id === (armedItemId ?? lastArmedId)) ?? items[0]

	const triggerUrls = useThumbnailUrls(source, shownItem ? [shownItem] : [], trigger)
	const gridUrls = useThumbnailUrls(source, items, grid)

	const pickItem = usePickItem(source)
	const close = useCallback(() => handleOpenChange(false), [handleOpenChange])
	// Picked from the keyboard too, an item arms, as a toolbar tool does.
	const pickAndClose = useCallback(
		(itemId: TLLibraryItemId, { thumbnailUrl }: ItemPick) => {
			pickItem(itemId, { thumbnailUrl })
			close()
		},
		[pickItem, close]
	)
	const getItemProps = useItemDrag(source, pickAndClose, close)

	return (
		<_Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
			<_Popover.Trigger asChild>
				<TldrawUiToolbarButton
					ref={setTrigger}
					type="tool"
					title={library.name}
					data-value={library.id}
					aria-pressed={armedItemId !== undefined}
					// Inside the toolbar's overflow, a click would close the overflow and this with it.
					onClick={(e) => e.stopPropagation()}
				>
					<ItemIcon
						source={source}
						item={shownItem}
						thumbnailUrl={shownItem && triggerUrls[shownItem.id]}
					/>
				</TldrawUiToolbarButton>
			</_Popover.Trigger>
			<_Popover.Portal container={container}>
				<_Popover.Content
					className="tlui-popover__content tlui-libraries-toolbar-popover"
					side="top"
					sideOffset={8}
					collisionPadding={8}
				>
					<TldrawUiToolbar ref={setGrid} orientation="grid" label={library.name}>
						{items.map((item) => (
							<TldrawUiToolbarButton
								key={item.id}
								type="icon"
								title={item.name ?? msg(messages.unnamedItem)}
								data-value={item.id}
								aria-pressed={item.id === armedItemId}
								isActive={item.id === armedItemId}
								{...getItemProps(item.id, gridUrls[item.id] ?? undefined)}
							>
								<ItemIcon source={source} item={item} thumbnailUrl={gridUrls[item.id]} />
							</TldrawUiToolbarButton>
						))}
					</TldrawUiToolbar>
				</_Popover.Content>
			</_Popover.Portal>
		</_Popover.Root>
	)
}

/** @public */
export interface LibrariesToolbarItemsProps {
	source: LibrarySource
}

/**
 * A toolbar item for each library the current user has put in their toolbar (see
 * {@link getToolbarLibraryIds}), for the children of a `DefaultToolbar`. Each opens a grid of the
 * library's items above the toolbar, and shows the item last armed from it. Picking an item arms
 * it, as clicking it in the panel does, and the library's toolbar item shows pressed while it stays
 * armed; dragging an item out drops a copy under the pointer.
 *
 * Put it after `DefaultToolbarContent` for the libraries to sit at the end of the toolbar, in its
 * overflow when there's no room; one with an armed item takes the overflow's slot for the last
 * tool used, as a tool does.
 * @public @react
 */
export function LibrariesToolbarItems({ source }: LibrariesToolbarItemsProps) {
	const libraries = useValue(
		'toolbar libraries',
		() => {
			const byId = new Map(source.getLibraries().map((library) => [library.id, library]))
			return getToolbarLibraryIds(source).flatMap((id) => {
				const library = byId.get(id)
				return library ? [library] : []
			})
		},
		[source]
	)
	return libraries.map((library) => (
		<ToolbarLibrary key={library.id} source={source} library={library} />
	))
}
