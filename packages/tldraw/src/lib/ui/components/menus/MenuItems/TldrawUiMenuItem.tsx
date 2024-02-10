import * as _ContextMenu from '@radix-ui/react-context-menu'
import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import { preventDefault, useEditor, useValue } from '@tldraw/editor'
import { useState } from 'react'
import { unwrapLabel } from '../../../hooks/useActions'
import { TLUiEventSource } from '../../../hooks/useEventsProvider'
import { TLUiTranslationKey } from '../../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import { Button } from '../../primitives/Button'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export function TldrawUiMenuItem<
	TransationKey extends string = string,
	IconType extends string = string,
>({
	disabled = false,
	id,
	kbd,
	label,
	readonlyOk,
	onSelect,
	noClose,
}: {
	icon?: IconType
	id: string
	kbd?: string
	title?: string
	label?: TransationKey | { [key: string]: TransationKey }
	readonlyOk: boolean
	onSelect: (source: TLUiEventSource) => Promise<void> | void
	disabled?: boolean
	noClose?: boolean
}) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()

	const editor = useEditor()
	const isReadOnly = useValue('isReadOnly', () => editor.getInstanceState().isReadonly, [editor])
	const msg = useTranslation()
	const [disableClicks, setDisableClicks] = useState(false)

	if (isReadOnly && !readonlyOk) return null

	const labelToUse = unwrapLabel(label, menuType)
	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

	const button = (
		<Button
			type="menu"
			data-testid={`menu-item.${id}`}
			kbd={kbd}
			label={labelStr}
			disabled={disabled}
			iconLeft={undefined}
			onClick={(e) => {
				if (noClose) preventDefault(e)

				if (disableClicks) {
					setDisableClicks(false)
				} else {
					onSelect(sourceId)
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
				<_ContextMenu.Item dir="ltr" asChild>
					{button}
				</_ContextMenu.Item>
			)
		}
	}
}
