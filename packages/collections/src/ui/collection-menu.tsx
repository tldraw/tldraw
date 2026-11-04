import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useTranslation,
} from 'tldraw'

const messages = defineMessages({
	moreOptions: { id: 'collections.collection-menu.title', defaultMessage: 'Collection options' },
	create: { id: 'collections.collection-menu.create', defaultMessage: 'New collection' },
	rename: { id: 'collections.collection-menu.rename', defaultMessage: 'Rename collection' },
	delete: { id: 'collections.collection-menu.delete', defaultMessage: 'Delete collection' },
	sort: { id: 'collections.collection-menu.sort', defaultMessage: 'Sort items by' },
	reverse: { id: 'collections.collection-menu.reverse', defaultMessage: 'Reverse order' },
})

/** @public */
export interface CollectionMenuSort {
	/** Each ordering's id and label, the label as is or as a translation key. */
	options: { id: string; label: string }[]
	value: string
	onValueChange(id: string): void
	reversed: boolean
	onReversedChange(reversed: boolean): void
}

/** @public */
export interface CollectionMenuProps {
	/** Leave out any action the source doesn't allow; the menu hides it. */
	onCreate?(): void
	onRename?(): void
	onDelete?(): void
	/** A "Sort items by" submenu. Leave out to hide it. */
	sort?: CollectionMenuSort
}

/**
 * A ⋯ menu for the panel's collections, laid out like the page menu's. Renders nothing when it has
 * no actions.
 * @public @react
 */
export function CollectionMenu({ onCreate, onRename, onDelete, sort }: CollectionMenuProps) {
	const msg = useTranslation()
	if (!onCreate && !onRename && !onDelete && !sort) return null

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
					{sort && (
						<TldrawUiMenuGroup id="sort">
							<TldrawUiMenuSubmenu id="sort-items" label={messages.sort.id}>
								<TldrawUiMenuGroup id="sort-orderings">
									{sort.options.map((option) => (
										<TldrawUiMenuCheckboxItem
											key={option.id}
											id={`sort-${option.id}`}
											label={option.label}
											checked={option.id === sort.value}
											readonlyOk
											onSelect={() => sort.onValueChange(option.id)}
										/>
									))}
								</TldrawUiMenuGroup>
								<TldrawUiMenuGroup id="sort-direction">
									<TldrawUiMenuCheckboxItem
										id="sort-reverse"
										label={messages.reverse.id}
										checked={sort.reversed}
										readonlyOk
										onSelect={() => sort.onReversedChange(!sort.reversed)}
									/>
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
