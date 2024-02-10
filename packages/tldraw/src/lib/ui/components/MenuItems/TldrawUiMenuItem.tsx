import * as _ContextMenu from '@radix-ui/react-context-menu'
import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import { preventDefault, useEditor, useValue } from '@tldraw/editor'
import { useState } from 'react'
import { TLUiActionItem } from '../../hooks/useActions'
import { TLUiEventSource } from '../../hooks/useEventsProvider'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Button } from '../primitives/Button'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export function TldrawUiMenuItem({
	disabled = false,
	actionItem,
}: {
	actionItem: TLUiActionItem
	disabled?: boolean
}) {
	const menuType = useTldrawUiMenuContext()

	const editor = useEditor()
	const isReadOnly = useValue('isReadOnly', () => editor.getInstanceState().isReadonly, [editor])
	const msg = useTranslation()
	const [disableClicks, setDisableClicks] = useState(false)

	if (isReadOnly && !actionItem.readonlyOk) return null

	const { id, contextMenuLabel, label, onSelect, kbd } = actionItem
	const labelToUse = contextMenuLabel ?? label
	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

	const button = (
		<Button
			type="menu"
			data-testid={`menu-item.${id}`}
			kbd={kbd}
			label={labelStr}
			disabled={disabled}
			iconLeft={undefined}
			onClick={() => {
				if (disableClicks) {
					setDisableClicks(false)
				} else {
					onSelect(menuType as TLUiEventSource)
				}
			}}
		/>
	)

	switch (menuType) {
		case 'menu': {
			return (
				<_DropdownMenu.Item dir="ltr" asChild onClick={preventDefault}>
					{button}
				</_DropdownMenu.Item>
			)
		}
		case 'context-menu': {
			return (
				<_ContextMenu.Item dir="ltr" asChild onClick={preventDefault}>
					{button}
				</_ContextMenu.Item>
			)
		}
	}
}
