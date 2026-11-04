import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useTranslation,
} from 'tldraw'

const messages = defineMessages({
	moreOptions: { id: 'collections.item-menu.title', defaultMessage: 'Item options' },
	rename: { id: 'collections.item-menu.rename', defaultMessage: 'Rename' },
	delete: { id: 'collections.item-menu.delete', defaultMessage: 'Delete' },
	moveTo: { id: 'collections.item-menu.move-to', defaultMessage: 'Move to' },
})

/** @public */
export interface ItemMenuProps {
	/** Unique per item, so each tile's menu opens on its own. */
	id: string
	/** Shown at the top of the menu. Leave out for an unnamed item. */
	name?: string
	/** Leave out to hide Rename, e.g. when the source doesn't allow it. */
	onRename?(): void
	/** Leave out to hide Delete. */
	onDelete?(): void
	/** The collections the item can move to. Leave out, or leave empty, to hide "Move to". */
	moveTargets?: { id: string; name: string }[]
	onMove?(collectionId: string): void
}

/**
 * The id of an item's {@link ItemMenu}, for opening it from elsewhere, e.g. a right-click on the
 * tile: `editor.menus.addOpenMenu(getItemMenuId(id))`.
 * @public
 */
export function getItemMenuId(id: string) {
	return `collections-item-menu-${id}`
}

/**
 * A ⋯ menu for one item, laid out like the page menu's. Renders nothing when it has no actions.
 * @public @react
 */
export function ItemMenu({ id, name, onRename, onDelete, moveTargets, onMove }: ItemMenuProps) {
	const msg = useTranslation()
	const canMove = onMove !== undefined && moveTargets !== undefined && moveTargets.length > 0
	if (!onRename && !onDelete && !canMove) return null

	return (
		<TldrawUiDropdownMenuRoot id={getItemMenuId(id)}>
			<TldrawUiDropdownMenuTrigger>
				<TldrawUiButton
					type="icon"
					className="tlui-collections-tile__menu-button"
					tooltip={msg(messages.moreOptions)}
					title={msg(messages.moreOptions)}
				>
					<TldrawUiButtonIcon icon="dots-vertical" small />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent side="bottom" align="end" sideOffset={4} alignOffset={0}>
				<TldrawUiMenuContextProvider type="menu" sourceId="menu">
					{name && (
						<div className="tlui-collections-menu-heading" role="presentation">
							{name}
						</div>
					)}
					{onRename && (
						<TldrawUiMenuGroup id="modify">
							<TldrawUiMenuItem id="rename" label={messages.rename.id} onSelect={onRename} />
						</TldrawUiMenuGroup>
					)}
					{canMove && (
						<TldrawUiMenuGroup id="move">
							<TldrawUiMenuSubmenu id="move-to" label={messages.moveTo.id}>
								<TldrawUiMenuGroup id="move-targets">
									{moveTargets.map((target) => (
										<TldrawUiMenuItem
											key={target.id}
											id={`move-to-${target.id}`}
											label={target.name}
											onSelect={() => onMove(target.id)}
										/>
									))}
								</TldrawUiMenuGroup>
							</TldrawUiMenuSubmenu>
						</TldrawUiMenuGroup>
					)}
					{onDelete && (
						<TldrawUiMenuGroup id="delete">
							<TldrawUiMenuItem id="delete" label={messages.delete.id} onSelect={onDelete} />
						</TldrawUiMenuGroup>
					)}
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
