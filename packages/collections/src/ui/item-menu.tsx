import { type PointerEvent, type RefObject, useEffect, useRef, useState } from 'react'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiDropdownMenuSub,
	TldrawUiDropdownMenuSubContent,
	TldrawUiDropdownMenuSubTrigger,
	useContainer,
	useTranslation,
} from 'tldraw'
import { RenameInput } from './rename-input'

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
	/**
	 * Called with the input's value when a rename in the menu completes. Leave out to hide Rename,
	 * e.g. when the source doesn't allow it.
	 */
	onRename?(name: string): void
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
 * A ⋯ menu for one item, headed by its name. Rename turns the heading into an input. Renders
 * nothing when it has no actions.
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
			<TldrawUiDropdownMenuContent
				className="tlui-collections-menu"
				side="bottom"
				align="start"
				alignOffset={0}
				sideOffset={0}
			>
				<ItemMenuContent
					id={id}
					name={name}
					onRename={onRename}
					onDelete={onDelete}
					moveTargets={canMove ? moveTargets : undefined}
					onMove={onMove}
				/>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}

/** Mounted only while the menu is open, so closing it ends a rename. */
function ItemMenuContent({ id, name, onRename, onDelete, moveTargets, onMove }: ItemMenuProps) {
	const msg = useTranslation()
	const [renaming, setRenaming] = useState(false)
	const renameItemRef = useRef<HTMLButtonElement>(null)
	useKeepMenuOpenOnEscape(renaming)

	// The submenu trigger takes no event handlers, so its wrapper does what MenuItem's keepFocus does.
	const keepFocus = (e: PointerEvent) => {
		if (renaming) e.preventDefault()
	}

	const stopRenaming = () => {
		setRenaming(false)
		// Enter and Escape blur the input, leaving focus nowhere. Deferred so Enter's keypress doesn't
		// land on Rename and start another rename.
		requestAnimationFrame(() => {
			const item = renameItemRef.current
			if (item && item.ownerDocument.activeElement === item.ownerDocument.body) item.focus()
		})
	}

	return (
		<>
			{renaming && onRename && (
				<div className="tlui-collections-menu__heading" onKeyDown={(e) => e.stopPropagation()}>
					<RenameInput
						className="tlui-collections-menu__rename"
						defaultValue={name ?? ''}
						onComplete={(newName) => {
							stopRenaming()
							onRename(newName)
						}}
						onCancel={stopRenaming}
					/>
				</div>
			)}
			{!renaming && name && (
				<div className="tlui-collections-menu__heading" role="presentation">
					<strong>{name}</strong>
				</div>
			)}
			<TldrawUiDropdownMenuGroup>
				{onRename && (
					<MenuItem
						buttonRef={renameItemRef}
						label={msg(messages.rename)}
						noClose
						holdFocus={renaming}
						onClick={() => setRenaming(true)}
					/>
				)}
				{moveTargets && onMove && (
					<TldrawUiDropdownMenuSub id={`${getItemMenuId(id)}-move-to`}>
						<div
							className="tlui-collections-menu__submenu-trigger"
							onPointerMoveCapture={keepFocus}
							onPointerOutCapture={keepFocus}
						>
							<TldrawUiDropdownMenuSubTrigger label={msg(messages.moveTo)} />
						</div>
						<TldrawUiDropdownMenuSubContent alignOffset={-4} sideOffset={0}>
							<TldrawUiDropdownMenuGroup className="tlui-collections-menu__submenu">
								{moveTargets.map((target) => (
									<MenuItem
										key={target.id}
										label={target.name}
										holdFocus={false}
										onClick={() => onMove(target.id)}
									/>
								))}
							</TldrawUiDropdownMenuGroup>
						</TldrawUiDropdownMenuSubContent>
					</TldrawUiDropdownMenuSub>
				)}
				{onDelete && (
					<MenuItem label={msg(messages.delete)} danger holdFocus={renaming} onClick={onDelete} />
				)}
			</TldrawUiDropdownMenuGroup>
		</>
	)
}

function MenuItem({
	buttonRef,
	label,
	danger,
	noClose,
	holdFocus,
	onClick,
}: {
	buttonRef?: RefObject<HTMLButtonElement | null>
	label: string
	danger?: boolean
	noClose?: boolean
	/** Stops the menu moving focus to the item on hover, which would blur and commit a rename. */
	holdFocus: boolean
	onClick(): void
}) {
	const keepFocus = (e: PointerEvent) => {
		if (holdFocus) e.preventDefault()
	}
	return (
		<TldrawUiDropdownMenuItem noClose={noClose}>
			<button
				ref={buttonRef}
				type="button"
				className={
					danger
						? 'tlui-collections-menu__item tlui-collections-menu__item--danger'
						: 'tlui-collections-menu__item'
				}
				onClick={onClick}
				onPointerMove={keepFocus}
				onPointerLeave={keepFocus}
			>
				<span>{label}</span>
			</button>
		</TldrawUiDropdownMenuItem>
	)
}

/**
 * The menu closes on Escape from a capture listener on the document, which runs before the input's
 * own handler. Marking the event handled on the window first lets Escape cancel the rename and leave
 * the menu open.
 */
function useKeepMenuOpenOnEscape(active: boolean) {
	const container = useContainer()
	useEffect(() => {
		const win = container.ownerDocument.defaultView
		if (!active || !win) return undefined
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') e.preventDefault()
		}
		win.addEventListener('keydown', onKeyDown, true)
		return () => win.removeEventListener('keydown', onKeyDown, true)
	}, [active, container])
}
