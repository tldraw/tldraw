import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useReadonly,
	useTranslation,
} from 'tldraw'
import { MenuCheckboxItem, MenuItem, MenuSubmenu } from './menu-items'

const messages = defineMessages({
	moreOptions: { id: 'collections.collection-menu.title', defaultMessage: 'Collection options' },
	create: { id: 'collections.collection-menu.create', defaultMessage: 'New collection' },
	rename: { id: 'collections.collection-menu.rename', defaultMessage: 'Rename collection' },
	delete: { id: 'collections.collection-menu.delete', defaultMessage: 'Delete collection' },
	sort: { id: 'collections.collection-menu.sort', defaultMessage: 'Sort items by' },
	reverse: { id: 'collections.collection-menu.reverse', defaultMessage: 'Reverse order' },
	move: { id: 'collections.collection-menu.move', defaultMessage: 'Move to' },
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
export interface CollectionMenuMove {
	/** Who the collection can move to, in the order to list them. */
	owners: { id: string; name: string }[]
	/** The collection's current owner, checked in the list. */
	value?: string
	onValueChange(ownerId: string): void
}

/** @public */
export interface CollectionMenuProps {
	/** Leave out any action the source doesn't allow; the menu hides it. */
	onCreate?(): void
	onRename?(): void
	onDelete?(): void
	/** A "Sort items by" submenu. Leave out to hide it. */
	sort?: CollectionMenuSort
	/** A "Move to" submenu of owners. Leave out to hide it. */
	move?: CollectionMenuMove
}

/**
 * A ⋯ menu for the panel's collections. Renders nothing when it has no actions.
 * @public @react
 */
export function CollectionMenu({ onCreate, onRename, onDelete, sort, move }: CollectionMenuProps) {
	const msg = useTranslation()
	const isReadonly = useReadonly()
	const create = isReadonly ? undefined : onCreate
	const rename = isReadonly ? undefined : onRename
	const remove = isReadonly ? undefined : onDelete
	const moveTo = isReadonly ? undefined : move
	if (!create && !rename && !remove && !sort && !moveTo) return null

	return (
		<TldrawUiDropdownMenuRoot id="collections-collection-menu">
			<TldrawUiDropdownMenuTrigger>
				<TldrawUiButton
					type="icon"
					tooltip={msg(messages.moreOptions)}
					title={msg(messages.moreOptions)}
				>
					<TldrawUiButtonIcon icon="dots-vertical" small />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent
				className="tlui-collections-menu"
				side="bottom"
				align="start"
				sideOffset={0}
				alignOffset={0}
			>
				<TldrawUiDropdownMenuGroup>
					{create && <MenuItem label={msg(messages.create)} onClick={create} />}
					{rename && <MenuItem label={msg(messages.rename)} onClick={rename} />}
					{sort && (
						<MenuSubmenu id="collections-collection-menu-sort" label={msg(messages.sort)}>
							{sort.options.map((option) => (
								<MenuCheckboxItem
									key={option.id}
									label={msg(option.label)}
									checked={option.id === sort.value}
									onSelect={() => sort.onValueChange(option.id)}
								/>
							))}
							<MenuCheckboxItem
								label={msg(messages.reverse)}
								checked={sort.reversed}
								onSelect={() => sort.onReversedChange(!sort.reversed)}
							/>
						</MenuSubmenu>
					)}
					{moveTo && (
						<MenuSubmenu id="collections-collection-menu-move" label={msg(messages.move)}>
							{moveTo.owners.map((owner) => (
								<MenuCheckboxItem
									key={owner.id}
									label={owner.name}
									checked={owner.id === moveTo.value}
									onSelect={() => {
										if (owner.id !== moveTo.value) moveTo.onValueChange(owner.id)
									}}
								/>
							))}
						</MenuSubmenu>
					)}
					{remove && <MenuItem label={msg(messages.delete)} danger onClick={remove} />}
				</TldrawUiDropdownMenuGroup>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
