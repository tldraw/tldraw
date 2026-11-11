import type { ReactNode } from 'react'
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
import type { TLLibraryOwner } from '../lib/LibrarySource'
import { MenuCheckboxItem, MenuItem, MenuSubmenu } from './menu-items'

const messages = defineMessages({
	moreOptions: { id: 'collections.collection-menu.title', defaultMessage: 'Collection options' },
	create: { id: 'collections.collection-menu.create', defaultMessage: 'New collection' },
	rename: { id: 'collections.collection-menu.rename', defaultMessage: 'Rename collection' },
	delete: { id: 'collections.collection-menu.delete', defaultMessage: 'Delete collection' },
	sort: { id: 'collections.collection-menu.sort', defaultMessage: 'Sort items by' },
	reverse: { id: 'collections.collection-menu.reverse', defaultMessage: 'Reverse order' },
	move: { id: 'collections.collection-menu.move', defaultMessage: 'Move to' },
	copy: { id: 'collections.collection-menu.copy', defaultMessage: 'Copy to' },
})

/** @public */
export interface LibraryMenuSort {
	/** Each ordering's id and label, the label as is or as a translation key. */
	options: { id: string; label: string }[]
	value: string
	onValueChange(id: string): void
	reversed: boolean
	onReversedChange(reversed: boolean): void
}

/** @public */
export interface LibraryMenuMove {
	/** Who the library can move to, in the order to list them. */
	owners: TLLibraryOwner[]
	/** The library's current owner, checked in the list. */
	value?: string
	onValueChange(ownerId: string): void
}

/** @public */
export interface LibraryMenuCopy {
	/** Who the library can be copied to, in the order to list them. */
	owners: TLLibraryOwner[]
	onSelect(ownerId: string): void
}

/** @public */
export interface LibraryMenuProps {
	/**
	 * Unique among the menus on screen: tldraw keeps a menu's open state by its id, so menus sharing
	 * one open and close together.
	 */
	id: string
	/** Leave out any action the source doesn't allow; the menu hides it. */
	onCreate?(): void
	onRename?(): void
	onDelete?(): void
	/** A "Sort items by" submenu. Leave out to hide it. */
	sort?: LibraryMenuSort
	/** A "Move to" submenu of owners. Leave out to hide it. */
	move?: LibraryMenuMove
	/** A "Copy to" submenu of owners. Leave out to hide it. */
	copy?: LibraryMenuCopy
	/**
	 * Items of the host's own, placed after "New library", e.g. {@link LibraryMenuItem}s. Shown
	 * in a read-only editor too, so leave out any that change the document.
	 */
	children?: ReactNode
}

/**
 * A ⋯ menu for the panel's libraries. Renders nothing when it has no actions.
 * @public @react
 */
export function LibraryMenu({
	id,
	onCreate,
	onRename,
	onDelete,
	sort,
	move,
	copy,
	children,
}: LibraryMenuProps) {
	const msg = useTranslation()
	const isReadonly = useReadonly()
	const create = isReadonly ? undefined : onCreate
	const rename = isReadonly ? undefined : onRename
	const remove = isReadonly ? undefined : onDelete
	const moveTo = isReadonly ? undefined : move
	const copyTo = isReadonly ? undefined : copy
	if (!create && !rename && !remove && !sort && !moveTo && !copyTo && !children) return null

	return (
		<TldrawUiDropdownMenuRoot id={id}>
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
				className="tlui-libraries-menu"
				side="bottom"
				align="start"
				sideOffset={0}
				alignOffset={0}
			>
				<TldrawUiDropdownMenuGroup>
					{create && <MenuItem label={msg(messages.create)} onClick={create} />}
					{children}
					{rename && <MenuItem label={msg(messages.rename)} onClick={rename} />}
					{sort && (
						<MenuSubmenu id={`${id}-sort`} label={msg(messages.sort)}>
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
						<MenuSubmenu id={`${id}-move`} label={msg(messages.move)}>
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
					{copyTo && (
						<MenuSubmenu id={`${id}-copy`} label={msg(messages.copy)}>
							{copyTo.owners.map((owner) => (
								<MenuItem
									key={owner.id}
									label={owner.name}
									onClick={() => copyTo.onSelect(owner.id)}
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
