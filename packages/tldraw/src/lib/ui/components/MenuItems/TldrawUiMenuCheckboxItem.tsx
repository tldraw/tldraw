import * as _ContextMenu from '@radix-ui/react-context-menu'
import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import { preventDefault, useEditor, useValue } from '@tldraw/editor'
import { TLUiActionItem } from '../../hooks/useActions'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Icon } from '../primitives/Icon'
import { Kbd } from '../primitives/Kbd'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export function TldrawUiMenuCheckboxItem({
	disabled = false,
	checked = false,
	actionItem,
}: {
	actionItem: TLUiActionItem
	checked?: boolean
	disabled?: boolean
}) {
	const editor = useEditor()
	const menuContext = useTldrawUiMenuContext()
	const isReadOnly = useValue('isReadOnly', () => editor.getInstanceState().isReadonly, [editor])
	const msg = useTranslation()

	if (isReadOnly && !actionItem.readonlyOk) return null

	const { id, contextMenuLabel, label, onSelect, kbd } = actionItem
	const labelToUse = contextMenuLabel ?? label
	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

	switch (menuContext) {
		case 'menu': {
			return (
				<_DropdownMenu.CheckboxItem
					dir="ltr"
					className="tlui-button tlui-button__menu tlui-button__checkbox"
					title={labelStr ? labelStr : undefined}
					onSelect={(e) => {
						onSelect?.('menu')
						preventDefault(e)
					}}
					disabled={disabled}
					checked={checked}
				>
					{labelStr && (
						<span className="tlui-button__label" draggable={false}>
							{labelStr}
						</span>
					)}
					{kbd && <Kbd>{kbd}</Kbd>}
				</_DropdownMenu.CheckboxItem>
			)
		}
		case 'context-menu': {
			return (
				<_ContextMenu.CheckboxItem
					key={id}
					className="tlui-button tlui-button__menu tlui-button__checkbox"
					dir="ltr"
					title={labelStr ? labelStr : undefined}
					onSelect={(e) => {
						onSelect('context-menu')
						preventDefault(e)
					}}
					disabled={disabled}
					checked={checked}
				>
					<Icon small icon={checked ? 'check' : 'checkbox-empty'} />
					{labelStr && (
						<span className="tlui-button__label" draggable={false}>
							{labelStr}
						</span>
					)}
					{kbd && <Kbd>{kbd}</Kbd>}
				</_ContextMenu.CheckboxItem>
			)
		}
	}
}
