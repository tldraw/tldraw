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
	moreOptions: { id: 'collections.collection-menu.title', defaultMessage: 'Collection options' },
	create: { id: 'collections.collection-menu.create', defaultMessage: 'New collection' },
	rename: { id: 'collections.collection-menu.rename', defaultMessage: 'Rename collection' },
	delete: { id: 'collections.collection-menu.delete', defaultMessage: 'Delete collection' },
})

/** @public */
export interface CollectionMenuProps {
	/** Leave out any action the source doesn't allow; the menu hides it. */
	onCreate?(): void
	onRename?(): void
	onDelete?(): void
}

/**
 * A ⋯ menu for the panel's collections, laid out like the page menu's. Renders nothing when it has
 * no actions.
 * @public @react
 */
export function CollectionMenu({ onCreate, onRename, onDelete }: CollectionMenuProps) {
	const msg = useTranslation()
	if (!onCreate && !onRename && !onDelete) return null

	return (
		<TldrawUiDropdownMenuRoot id="collections-collection-menu">
			<TldrawUiDropdownMenuTrigger>
				<TldrawUiButton
					type="icon"
					tooltip={msg(messages.moreOptions)}
					title={msg(messages.moreOptions)}
				>
					<TldrawUiButtonIcon icon="dots-horizontal" small />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent side="bottom" align="end" sideOffset={4} alignOffset={0}>
				<TldrawUiMenuContextProvider type="menu" sourceId="menu">
					{onCreate && (
						<TldrawUiMenuGroup id="create">
							<TldrawUiMenuItem id="create" label={messages.create.id} onSelect={onCreate} />
						</TldrawUiMenuGroup>
					)}
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
