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
	moreOptions: { id: 'libraries.library-menu.title', defaultMessage: 'Library options' },
	create: { id: 'libraries.library-menu.create', defaultMessage: 'New library' },
	createInside: {
		id: 'libraries.library-menu.create-inside',
		defaultMessage: 'New library inside',
	},
	topLevel: { id: 'libraries.library-menu.top-level', defaultMessage: 'Top level' },
	rename: { id: 'libraries.library-menu.rename', defaultMessage: 'Rename library' },
	delete: { id: 'libraries.library-menu.delete', defaultMessage: 'Delete library' },
	sort: { id: 'libraries.library-menu.sort', defaultMessage: 'Sort items by' },
	reverse: { id: 'libraries.library-menu.reverse', defaultMessage: 'Reverse order' },
	move: { id: 'libraries.library-menu.move', defaultMessage: 'Move to' },
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

/**
 * A place a library can be moved or copied to: an owner's top level, or a library to go inside.
 * @public
 */
export interface LibraryMenuDestination {
	/** Unique in the list, and passed back when it is picked. */
	key: string
	/** Left out for the top level of a source without owners, labelled "Top level". */
	label?: string
	icon?: TLLibraryOwner['icon']
	/** How far in to indent it: 0 for an owner's top level, 1 for a library at it, and so on. */
	depth: number
	/** Where the library is now, checked in "Move to". */
	current?: boolean
}

/** @public */
export interface LibraryMenuMove {
	/** Where the library can move to, as a tree under each owner, in the order to list them. */
	destinations: LibraryMenuDestination[]
	onSelect(key: string): void
}

/** @public */
export interface LibraryMenuCopy {
	/** Where the library can be copied to, as for {@link LibraryMenuMove}. */
	destinations: LibraryMenuDestination[]
	onSelect(key: string): void
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
	/** "New library inside" this one. */
	onCreateInside?(): void
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
	onCreateInside,
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
	const createInside = isReadonly ? undefined : onCreateInside
	const rename = isReadonly ? undefined : onRename
	const remove = isReadonly ? undefined : onDelete
	const moveTo = isReadonly ? undefined : move
	const copyTo = isReadonly ? undefined : copy
	if (!create && !createInside && !rename && !remove && !sort && !moveTo && !copyTo && !children) {
		return null
	}
	const label = (destination: LibraryMenuDestination) => destination.label ?? msg(messages.topLevel)

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
					{createInside && <MenuItem label={msg(messages.createInside)} onClick={createInside} />}
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
							{moveTo.destinations.map((destination) => (
								<MenuCheckboxItem
									key={destination.key}
									label={label(destination)}
									depth={destination.depth}
									checked={!!destination.current}
									onSelect={() => {
										if (!destination.current) moveTo.onSelect(destination.key)
									}}
								/>
							))}
						</MenuSubmenu>
					)}
					{copyTo && (
						<MenuSubmenu id={`${id}-copy`} label={msg(messages.copy)}>
							{copyTo.destinations.map((destination) => (
								<MenuItem
									key={destination.key}
									label={label(destination)}
									icon={destination.icon}
									depth={destination.depth}
									onClick={() => copyTo.onSelect(destination.key)}
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
