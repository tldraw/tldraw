import * as _ContextMenu from '@radix-ui/react-context-menu'
import { App, preventDefault, useApp, useContainer } from '@tldraw/editor'
import classNames from 'classnames'
import * as React from 'react'
import { useValue } from 'signia-react'
import { MenuChild } from '../hooks/menuHelpers'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useMenuClipboardEvents } from '../hooks/useClipboardEvents'
import { useContextMenuSchema } from '../hooks/useContextMenuSchema'
import { useMenuIsOpen } from '../hooks/useMenuIsOpen'
import { useReadonly } from '../hooks/useReadonly'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { MoveToPageMenu } from './MoveToPageMenu'
import { Button } from './primitives/Button'
import { Icon } from './primitives/Icon'
import { Kbd } from './primitives/Kbd'

/** @public */
export interface ContextMenuProps {
	children: any
}

/** @public */
export const ContextMenu = function ContextMenu({ children }: { children: any }) {
	const app = useApp()

	const contextMenuSchema = useContextMenuSchema()
	const handleOpenChange = useMenuIsOpen('context menu')

	// If every item in the menu is readonly, then we don't want to show the menu
	const isReadonly = useReadonly()

	const noItemsToShow =
		contextMenuSchema.length === 0 ||
		(isReadonly && contextMenuSchema.every((item) => !item.readonlyOk))

	const selectToolActive = useValue('isSelectToolActive', () => app.currentToolId === 'select', [
		app,
	])

	const disabled = !selectToolActive || noItemsToShow

	return (
		<_ContextMenu.Root dir="ltr" onOpenChange={handleOpenChange}>
			<_ContextMenu.Trigger
				onContextMenu={disabled ? preventDefault : undefined}
				dir="ltr"
				disabled={disabled}
			>
				{children}
			</_ContextMenu.Trigger>
			<ContextMenuContent />
		</_ContextMenu.Root>
	)
}

function ContextMenuContent() {
	const app = useApp()
	const msg = useTranslation()
	const menuSchema = useContextMenuSchema()
	const handleSubOpenChange = useMenuIsOpen('context menu sub')

	const isReadonly = useReadonly()
	const { paste } = useMenuClipboardEvents('context-menu')
	const breakpoint = useBreakpoint()
	const container = useContainer()

	const [disableClicks, setDisableClicks] = React.useState(false)

	function getContextMenuItem(app: App, item: MenuChild, parent: MenuChild | null, depth: number) {
		if (isReadonly && !item.readonlyOk) return null

		switch (item.type) {
			case 'custom': {
				switch (item.id) {
					case 'MENU_PASTE': {
						return (
							<_ContextMenu.Item key={item.id}>
								<Button
									className="tlui-menu__button"
									data-wd={`menu-item.${item.id}`}
									kbd="$v"
									label="action.paste"
									disabled={item.disabled}
									onClick={() => {
										if (!app.isSafari || (app.isSafari && app.isIos)) {
											navigator.clipboard.read().then((clipboardItems) => {
												paste(clipboardItems, app.inputs.currentPagePoint)
											})
										}
									}}
									onMouseDown={() => {
										if (app.isSafari && !app.isIos) {
											// NOTE: This must be a onMouseDown for Safari/desktop, onClick doesn't work at the time of writing... 😒
											navigator.clipboard.read().then((clipboardItems) => {
												paste(clipboardItems, app.inputs.currentPagePoint)
											})
										}
									}}
									// onPointerUp={() => {
									// 	if (app.isSafari && app.isIos) {
									// 		// NOTE: This must be a onPointerUp for Safari/mobile, onClick doesn't work at the time of writing... 😒
									// 		navigator.clipboard.read().then((clipboardItems) => {
									// 			paste(clipboardItems, app.inputs.currentPagePoint)
									// 		})
									// 	}
									// }}
								/>
							</_ContextMenu.Item>
						)
					}
					case 'MOVE_TO_PAGE_MENU': {
						return <MoveToPageMenu key={item.id} />
					}
				}
				break
			}
			case 'group': {
				return (
					<_ContextMenu.Group
						dir="ltr"
						className={classNames('tlui-menu__group', {
							'tlui-menu__group__small': parent?.type === 'submenu',
						})}
						data-wd={`menu-item.${item.id}`}
						key={item.id}
					>
						{item.children.map((child) => getContextMenuItem(app, child, item, depth + 1))}
					</_ContextMenu.Group>
				)
			}
			case 'submenu': {
				return (
					<_ContextMenu.Sub key={item.id} onOpenChange={handleSubOpenChange}>
						<_ContextMenu.SubTrigger dir="ltr" disabled={item.disabled} asChild>
							<Button
								className="tlui-menu__button"
								label={item.label}
								data-wd={`menu-item.${item.id}`}
								icon="chevron-right"
							/>
						</_ContextMenu.SubTrigger>
						<_ContextMenu.Portal container={container} dir="ltr">
							<_ContextMenu.SubContent className="tlui-menu" sideOffset={-4} collisionPadding={4}>
								{item.children.map((child) => getContextMenuItem(app, child, item, depth + 1))}
							</_ContextMenu.SubContent>
						</_ContextMenu.Portal>
					</_ContextMenu.Sub>
				)
			}
			case 'item': {
				if (isReadonly && !item.readonlyOk) return null

				const { id, checkbox, contextMenuLabel, label, onSelect, kbd, icon } = item.actionItem
				const labelToUse = contextMenuLabel ?? label
				const labelStr = labelToUse ? msg(labelToUse) : undefined

				if (checkbox) {
					// Item is in a checkbox group
					return (
						<_ContextMenu.CheckboxItem
							key={id}
							className="tlui-button tlui-menu__button tlui-menu__checkbox-item"
							dir="ltr"
							disabled={item.disabled}
							onSelect={(e) => {
								onSelect('context-menu')
								preventDefault(e)
							}}
							title={labelStr ? labelStr : undefined}
							checked={item.checked}
						>
							<div
								className="tlui-menu__checkbox-item__check"
								style={{
									transformOrigin: '75% center',
									transform: `scale(${item.checked ? 1 : 0.5})`,
									opacity: item.checked ? 1 : 0.5,
								}}
							>
								<Icon small icon={item.checked ? 'check' : 'checkbox-empty'} />
							</div>
							{labelStr && <span>{labelStr}</span>}
							{kbd && <Kbd>{kbd}</Kbd>}
						</_ContextMenu.CheckboxItem>
					)
				}

				return (
					<_ContextMenu.Item key={id} dir="ltr" asChild>
						<Button
							className="tlui-menu__button"
							data-wd={`menu-item.${id}`}
							kbd={kbd}
							label={labelToUse}
							disabled={item.disabled}
							iconLeft={breakpoint < 3 && depth > 2 ? icon : undefined}
							onClick={() => {
								if (disableClicks) {
									setDisableClicks(false)
								} else {
									onSelect('context-menu')
								}
							}}
						/>
					</_ContextMenu.Item>
				)
			}
		}
	}

	return (
		<_ContextMenu.Portal dir="ltr" container={container}>
			<_ContextMenu.Content
				className="tlui-menu scrollable"
				alignOffset={-4}
				collisionPadding={4}
				onContextMenu={preventDefault}
			>
				{menuSchema.map((item) => getContextMenuItem(app, item, null, 0))}
			</_ContextMenu.Content>
		</_ContextMenu.Portal>
	)
}
