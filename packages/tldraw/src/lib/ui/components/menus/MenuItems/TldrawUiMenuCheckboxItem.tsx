import * as _ContextMenu from '@radix-ui/react-context-menu'
import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import { preventDefault } from '@tldraw/editor'
import { unwrapLabel } from '../../../hooks/useActions'
import { TLUiEventSource } from '../../../hooks/useEventsProvider'
import { useReadonly } from '../../../hooks/useReadonly'
import { TLUiTranslationKey } from '../../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import { Icon } from '../../primitives/Icon'
import { Kbd } from '../../primitives/Kbd'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export function TldrawUiMenuCheckboxItem<
	TransationKey extends string = string,
	IconType extends string = string,
>({
	id,
	kbd,
	label,
	readonlyOk,
	onSelect,
	disabled = false,
	checked = false,
}: {
	icon?: IconType
	id: string
	kbd?: string
	title?: string
	label?: TransationKey | { [key: string]: TransationKey }
	readonlyOk: boolean
	onSelect: (source: TLUiEventSource) => Promise<void> | void
	checked?: boolean
	disabled?: boolean
}) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()
	const isReadOnly = useReadonly()
	const msg = useTranslation()

	if (isReadOnly && !readonlyOk) return null

	const labelToUse = unwrapLabel(label, menuType)
	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

	switch (menuType) {
		case 'menu': {
			return (
				<_DropdownMenu.CheckboxItem
					dir="ltr"
					className="tlui-button tlui-button__menu tlui-button__checkbox"
					title={labelStr}
					onSelect={(e) => {
						onSelect?.(sourceId)
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
				</_DropdownMenu.CheckboxItem>
			)
		}
		case 'context-menu': {
			return (
				<_ContextMenu.CheckboxItem
					key={id}
					className="tlui-button tlui-button__menu tlui-button__checkbox"
					dir="ltr"
					title={labelStr}
					onSelect={(e) => {
						onSelect(sourceId)
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
