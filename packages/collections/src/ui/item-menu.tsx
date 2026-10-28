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
	useTranslation,
} from 'tldraw'

const messages = defineMessages({
	moreOptions: { id: 'collections.item-menu.title', defaultMessage: 'Item options' },
	rename: { id: 'collections.item-menu.rename', defaultMessage: 'Rename' },
	delete: { id: 'collections.item-menu.delete', defaultMessage: 'Delete' },
})

/** @public */
export interface ItemMenuProps {
	/** Unique per item, so each tile's menu opens on its own. */
	id: string
	/** Leave out to hide Rename, e.g. when the source doesn't allow it. */
	onRename?(): void
	/** Leave out to hide Delete. */
	onDelete?(): void
}

/**
 * A ⋯ menu for one item, laid out like the page menu's. Renders nothing when it has no actions.
 * @public @react
 */
export function ItemMenu({ id, onRename, onDelete }: ItemMenuProps) {
	const msg = useTranslation()
	if (!onRename && !onDelete) return null

	return (
		<TldrawUiDropdownMenuRoot id={`collections-item-menu-${id}`}>
			<TldrawUiDropdownMenuTrigger>
				<TldrawUiButton
					type="icon"
					className="tlui-collections-tile__menu-button"
					tooltip={msg(messages.moreOptions)}
					title={msg(messages.moreOptions)}
				>
					<TldrawUiButtonIcon icon="dots-horizontal" small />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent side="bottom" align="end" sideOffset={4} alignOffset={0}>
				<TldrawUiMenuContextProvider type="menu" sourceId="menu">
					{onRename && (
						<TldrawUiMenuGroup id="modify">
							<TldrawUiMenuItem id="rename" label={messages.rename.id} onSelect={onRename} />
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
