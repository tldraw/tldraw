import { Popover as _Popover } from 'radix-ui'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
	useTldrawUiOrientation,
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
	armShown: { id: 'libraries.toolbar.arm-shown', defaultMessage: '{item} from {library}' },
	openLibrary: { id: 'libraries.toolbar.open', defaultMessage: 'More from {library}' },
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
	const { orientation } = useTldrawUiOrientation()
	const popoverId = `libraries-toolbar-${useUniqueSafeId()}`
	const [isOpen, handleOpenChange] = useMenuIsOpen(popoverId)
	// Held in a ref, not state: Radix's slot hands it a new callback ref on every render.
	const controlRef = useRef<HTMLDivElement | null>(null)
	const [control, setControl] = useState<HTMLDivElement | null>(null)
	useLayoutEffect(() => setControl(controlRef.current), [])
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
	// The main button shows the item last armed from this library, and arms it again.
	const [lastArmedId, setLastArmedId] = useState<TLLibraryItemId>()
	useEffect(() => {
		if (armedItemId) setLastArmedId(armedItemId)
	}, [armedItemId])
	const shownItem = items.find((item) => item.id === (armedItemId ?? lastArmedId)) ?? items[0]

	const shownItems = useMemo(() => (shownItem ? [shownItem] : []), [shownItem])
	const shownUrls = useThumbnailUrls(source, shownItems, control)
	const gridUrls = useThumbnailUrls(source, items, grid)
	const shownName = shownItem && (shownItem.name ?? msg(messages.unnamedItem))

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
			<_Popover.Anchor asChild>
				<div
					ref={controlRef}
					role="group"
					aria-label={library.name}
					className="tlui-libraries-toolbar-library"
					data-value={library.id}
				>
					<TldrawUiToolbarButton
						type="tool"
						title={
							shownName
								? msg(messages.armShown, { item: shownName, library: library.name })
								: library.name
						}
						aria-pressed={armedItemId !== undefined}
						disabled={!shownItem}
						onClick={() => {
							if (!shownItem) return
							pickItem(shownItem.id, { thumbnailUrl: shownUrls[shownItem.id] ?? undefined })
						}}
					>
						<ItemIcon
							source={source}
							item={shownItem}
							thumbnailUrl={shownItem && shownUrls[shownItem.id]}
						/>
					</TldrawUiToolbarButton>
					<_Popover.Trigger asChild>
						<TldrawUiToolbarButton
							type="tool"
							className="tlui-libraries-toolbar-library__more"
							title={msg(messages.openLibrary, { library: library.name })}
							// Inside the toolbar's overflow, a click would close the overflow and this with it.
							onClick={(e) => e.stopPropagation()}
						>
							<TldrawUiButtonIcon
								icon={orientation === 'horizontal' ? 'chevron-up' : 'chevron-right'}
								small
							/>
						</TldrawUiToolbarButton>
					</_Popover.Trigger>
				</div>
			</_Popover.Anchor>
			<_Popover.Portal container={container}>
				<_Popover.Content
					className="tlui-popover__content tlui-libraries-toolbar-popover"
					side={orientation === 'horizontal' ? 'top' : 'right'}
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
 * {@link getToolbarLibraryIds}), for the children of a `DefaultToolbar`. Each is a split button: its
 * main part shows the item last armed from the library and arms it again, and shows pressed while
 * one of the library's items is armed; its chevron opens a grid of the library's items. Picking an
 * item there arms it, from the keyboard too, as picking a tool does; dragging one out drops a copy
 * under the pointer.
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
