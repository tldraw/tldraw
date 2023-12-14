import { Editor, useEditor } from '@tldraw/editor'
import * as React from 'react'
import { TLUiMenuChild } from '../hooks/menuHelpers'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useMenuSchema } from '../hooks/useMenuSchema'
import { useReadonly } from '../hooks/useReadonly'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { LanguageMenu } from './LanguageMenu'
import { Button } from './primitives/Button'
import * as M from './primitives/DropdownMenu'
import { Kbd } from './primitives/Kbd'

export const Menu = React.memo(function Menu() {
	const msg = useTranslation()

	return (
		<M.Root id="main menu">
			<M.Trigger>
				<Button
					type="icon"
					className="tlui-menu__trigger"
					data-testid="main.menu"
					title={msg('menu.title')}
					icon="menu"
					smallIcon
				/>
			</M.Trigger>
			<M.Content alignOffset={0} sideOffset={6}>
				<MenuContent />
			</M.Content>
		</M.Root>
	)
})

function MenuContent() {
	const editor = useEditor()
	const msg = useTranslation()
	const menuSchema = useMenuSchema()
	const breakpoint = useBreakpoint()
	const isReadonly = useReadonly()

	function getMenuItem(
		editor: Editor,
		item: TLUiMenuChild,
		parent: TLUiMenuChild | null,
		depth: number
	) {
		if (!item) return null
		switch (item.type) {
			case 'custom': {
				if (isReadonly && !item.readonlyOk) return null

				if (item.id === 'LANGUAGE_MENU') {
					return <LanguageMenu key="item" />
				}

				return null
			}
			case 'group': {
				if (isReadonly && !item.readonlyOk) return null

				return (
					<M.Group
						size={
							depth <= 1
								? 'medium'
								: breakpoint < 3 || (parent?.type === 'submenu' && depth > 2)
								? 'tiny'
								: 'medium'
						}
						key={item.id}
					>
						{item.children.map((child) => getMenuItem(editor, child, item, depth + 1))}
					</M.Group>
				)
			}
			case 'submenu': {
				if (isReadonly && !item.readonlyOk) return null

				return (
					<M.Sub id={`main menu ${parent ? parent.id + ' ' : ''}${item.id}`} key={item.id}>
						<M.SubTrigger label={item.label} data-testid={`menu-item.${item.id}`} />
						<M.SubContent sideOffset={-4} alignOffset={-1}>
							{item.children.map((child) => getMenuItem(editor, child, item, depth + 1))}
						</M.SubContent>
					</M.Sub>
				)
			}
			case 'item': {
				if (isReadonly && !item.readonlyOk) return null

				const { id, checkbox, menuLabel, label, onSelect, kbd } = item.actionItem
				const labelToUse = menuLabel ?? label
				const labelStr = labelToUse ? msg(labelToUse) : undefined

				if (checkbox) {
					// Item is in a checkbox group
					return (
						<M.CheckboxItem
							key={id}
							onSelect={() => onSelect('menu')}
							title={labelStr ? labelStr : ''}
							checked={item.checked}
							disabled={item.disabled}
						>
							{labelStr && <span className="tlui-button__label">{labelStr}</span>}
							{kbd && <Kbd>{kbd}</Kbd>}
						</M.CheckboxItem>
					)
				}

				// Item is a button
				return (
					<M.Item
						type="menu"
						key={id}
						data-testid={`menu-item.${item.id}`}
						kbd={kbd}
						label={labelToUse}
						onClick={() => onSelect('menu')}
						disabled={item.disabled}
					/>
				)
			}
		}
	}

	return <>{menuSchema.map((item) => getMenuItem(editor, item, null, 0))}</>
}
