import type { ReactNode } from 'react'
import {
	defineMessages,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	useTranslation,
} from 'tldraw'
import type { TLLibraryOwner } from '../lib/LibrarySource'
import { keepClaimedFocus } from './keep-claimed-focus'
import { MenuCheckboxItem, MenuItem, MenuSubmenu } from './menu-items'
import { MenuRoot } from './menu-root'

const messages = defineMessages({
	moreOptions: { id: 'libraries.library-menu.title', defaultMessage: 'Library options' },
	create: { id: 'libraries.library-menu.create', defaultMessage: 'New library' },
	rename: { id: 'libraries.library-menu.rename', defaultMessage: 'Rename' },
	delete: { id: 'libraries.library-menu.delete', defaultMessage: 'Delete' },
	addToDocument: { id: 'libraries.library-menu.add-to-document', defaultMessage: 'Add to file' },
	removeFromDocument: {
		id: 'libraries.library-menu.remove-from-document',
		defaultMessage: 'Remove from file',
	},
	sort: { id: 'libraries.library-menu.sort', defaultMessage: 'Sort by' },
	reverse: { id: 'libraries.library-menu.reverse', defaultMessage: 'Reverse order' },
	copy: { id: 'libraries.library-menu.copy', defaultMessage: 'Copy to' },
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
	/**
	 * `'button'`, the default, opens the menu from a ⋯ button. With `'none'` it has no button and
	 * opens only by its id, e.g. on a right-click, against the nearest positioned element around it.
	 */
	trigger?: 'button' | 'none'
	/** Leave out any action the source doesn't allow; the menu hides it. */
	onCreate?(): void
	onRename?(): void
	onDelete?(): void
	/** Shows the library in the document. */
	onAddToDocument?(): void
	/** Stops showing the library in the document, without deleting it. */
	onRemoveFromDocument?(): void
	/** A "Sort by" submenu. Leave out to hide it. */
	sort?: LibraryMenuSort
	/** A "Copy to" submenu of owners. Leave out to hide it. */
	copy?: LibraryMenuCopy
	/**
	 * Items of the host's own, placed before Delete, e.g. {@link LibraryMenuItem}s. The menu doesn't
	 * check whether the editor is read-only, so gate any that change the document.
	 */
	children?: ReactNode
}

/**
 * A menu for a library: add it to or remove it from the file, rename it, sort its items, copy it,
 * the host's items, then Delete. Renders nothing when it has no actions.
 * @public @react
 */
export function LibraryMenu({
	id,
	trigger = 'button',
	onCreate: create,
	onRename: rename,
	onDelete: remove,
	onAddToDocument: addToDocument,
	onRemoveFromDocument: removeFromDocument,
	sort,
	copy: copyTo,
	children,
}: LibraryMenuProps) {
	const msg = useTranslation()
	if (
		!create &&
		!rename &&
		!remove &&
		!addToDocument &&
		!removeFromDocument &&
		!sort &&
		!copyTo &&
		!children
	) {
		return null
	}

	return (
		<MenuRoot id={id} trigger={trigger} label={msg(messages.moreOptions)}>
			<TldrawUiDropdownMenuContent
				className="tlui-libraries-menu"
				side="bottom"
				align="start"
				sideOffset={0}
				alignOffset={0}
				onCloseAutoFocus={keepClaimedFocus}
			>
				<TldrawUiDropdownMenuGroup>
					{addToDocument && (
						<MenuItem label={msg(messages.addToDocument)} onClick={addToDocument} />
					)}
					{removeFromDocument && (
						<MenuItem label={msg(messages.removeFromDocument)} onClick={removeFromDocument} />
					)}
					{create && <MenuItem label={msg(messages.create)} onClick={create} />}
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
					{children}
				</TldrawUiDropdownMenuGroup>
				{remove && (
					<TldrawUiDropdownMenuGroup>
						<MenuItem label={msg(messages.delete)} onClick={remove} />
					</TldrawUiDropdownMenuGroup>
				)}
			</TldrawUiDropdownMenuContent>
		</MenuRoot>
	)
}
