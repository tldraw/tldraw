import type { ReactNode } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useTranslation,
} from 'tldraw'
import { ContextMenuAnchor } from './context-menu'
import { type LibraryMenuTarget, MenuItem, MenuSubmenu, MenuTargetItems } from './menu-items'

const messages = defineMessages({
	moreOptions: { id: 'libraries.item-menu.title', defaultMessage: 'Item options' },
	insert: { id: 'libraries.item-menu.insert', defaultMessage: 'Insert' },
	details: { id: 'libraries.item-menu.details', defaultMessage: 'Details' },
	rename: { id: 'libraries.item-menu.rename', defaultMessage: 'Rename' },
	delete: { id: 'libraries.item-menu.delete', defaultMessage: 'Delete' },
	moveTo: { id: 'libraries.item-menu.move-to', defaultMessage: 'Move to' },
	copyTo: { id: 'libraries.item-menu.copy-to', defaultMessage: 'Copy to' },
})

/** @public */
export interface ItemMenuProps {
	/** Unique per item, so each tile's menu opens on its own. */
	id: string
	/**
	 * `'button'`, the default, opens the menu from a ⋯ button. With `'none'` it has no button and
	 * opens only by its id, as the panel's tiles open it on a right-click or a long press, against
	 * the nearest positioned element around it.
	 */
	trigger?: 'button' | 'none'
	/** Places the item, as clicking its tile does. Leave out to hide Insert. */
	onInsert?(): void
	/** Leave out to hide Details. */
	onShowDetails?(): void
	/** Starts renaming the item wherever its name is shown. Leave out to hide Rename. */
	onRename?(): void
	/** Leave out to hide Delete. */
	onDelete?(): void
	/** The libraries the item can move to. Leave out, or leave empty, to hide "Move to". */
	moveTargets?: LibraryMenuTarget[]
	onMove?(libraryId: string): void
	/** The libraries the item can be copied to. Leave out, or leave empty, to hide "Copy to". */
	copyTargets?: LibraryMenuTarget[]
	onCopy?(libraryId: string): void
	/**
	 * Items of the host's own, placed after Details, e.g. {@link LibraryMenuItem}s. Shown in a
	 * read-only editor too, so leave out any that change the document.
	 */
	children?: ReactNode
}

/**
 * The id of an item's {@link ItemMenu}, for opening it from elsewhere, e.g. a right-click on the
 * tile: `editor.menus.addOpenMenu(getItemMenuId(id))`.
 * @public
 */
export function getItemMenuId(id: string) {
	return `libraries-item-menu-${id}`
}

/**
 * A menu for one item: Insert, Details, Rename, "Move to", "Copy to", then Delete. Renders nothing
 * when it has no actions.
 * @public @react
 */
export function ItemMenu({
	id,
	trigger = 'button',
	onInsert,
	onShowDetails,
	onRename,
	onDelete,
	moveTargets,
	onMove,
	copyTargets,
	onCopy,
	children,
}: ItemMenuProps) {
	const msg = useTranslation()
	const menuId = getItemMenuId(id)
	const canMove = onMove !== undefined && moveTargets !== undefined && moveTargets.length > 0
	const canCopy = onCopy !== undefined && copyTargets !== undefined && copyTargets.length > 0
	if (!onInsert && !onShowDetails && !onRename && !onDelete && !canMove && !canCopy && !children) {
		return null
	}

	return (
		<TldrawUiDropdownMenuRoot id={menuId}>
			{trigger === 'none' ? (
				<ContextMenuAnchor menuId={menuId} />
			) : (
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton
						type="icon"
						tooltip={msg(messages.moreOptions)}
						title={msg(messages.moreOptions)}
					>
						<TldrawUiButtonIcon icon="dots-vertical" small />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
			)}
			<TldrawUiDropdownMenuContent
				className="tlui-libraries-menu"
				side="bottom"
				align="start"
				alignOffset={0}
				sideOffset={0}
			>
				<TldrawUiDropdownMenuGroup>
					{onInsert && <MenuItem label={msg(messages.insert)} onClick={onInsert} />}
					{onShowDetails && <MenuItem label={msg(messages.details)} onClick={onShowDetails} />}
					{children}
					{onRename && <MenuItem label={msg(messages.rename)} onClick={onRename} />}
					{canMove && onMove && (
						<MenuSubmenu id={`${menuId}-move-to`} label={msg(messages.moveTo)}>
							<MenuTargetItems targets={moveTargets} onSelect={onMove} />
						</MenuSubmenu>
					)}
					{canCopy && onCopy && (
						<MenuSubmenu id={`${menuId}-copy-to`} label={msg(messages.copyTo)}>
							<MenuTargetItems targets={copyTargets} onSelect={onCopy} />
						</MenuSubmenu>
					)}
				</TldrawUiDropdownMenuGroup>
				{onDelete && (
					<TldrawUiDropdownMenuGroup>
						<MenuItem label={msg(messages.delete)} onClick={onDelete} />
					</TldrawUiDropdownMenuGroup>
				)}
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
