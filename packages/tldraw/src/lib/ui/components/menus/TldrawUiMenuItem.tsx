import * as _ContextMenu from '@radix-ui/react-context-menu'
import * as _DropdownMenu from '@radix-ui/react-dropdown-menu'
import { preventDefault } from '@tldraw/editor'
import { useState } from 'react'
import { unwrapLabel } from '../../hooks/useActions'
import { TLUiEventSource } from '../../hooks/useEventsProvider'
import { useReadonly } from '../../hooks/useReadonly'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Button } from '../primitives/Button'
import { Kbd } from '../primitives/Kbd'
import { kbdStr } from '../primitives/shared'
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
	icon,
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

	const msg = useTranslation()

	const [disableClicks, setDisableClicks] = useState(false)

	const isReadOnly = useReadonly()
	if (isReadOnly && !readonlyOk) return null

	const labelToUse = unwrapLabel(label, menuType)
	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

	const button = (
		<Button
			type="menu"
			data-testid={`${sourceId}.${id}`}
			kbd={kbd}
			label={labelStr}
			disabled={disabled}
			iconLeft={undefined}
			onClick={(e) => {
				if (noClose) {
					preventDefault(e)
				}
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
				<_DropdownMenu.Item dir="ltr" asChild>
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
		case 'actions': {
			return (
				<Button
					data-testid={`${sourceId}.${id}`}
					icon={icon}
					type="icon"
					title={
						label
							? kbd
								? `${msg(unwrapLabel(label))} ${kbdStr(kbd)}`
								: `${msg(unwrapLabel(label))}`
							: kbd
								? `${kbdStr(kbd)}`
								: ''
					}
					onClick={() => onSelect('actions-menu')}
					smallIcon
					disabled={disabled}
				/>
			)
		}
		case 'keyboard-shortcuts': {
			if (!kbd) return null

			return (
				<div className="tlui-shortcuts-dialog__key-pair" data-testid={`${sourceId}.${id}`}>
					<div className="tlui-shortcuts-dialog__key-pair__key">
						{msg(unwrapLabel(label, 'shortcuts'))}
					</div>
					<div className="tlui-shortcuts-dialog__key-pair__value">
						<Kbd>{kbd!}</Kbd>
					</div>
				</div>
			)
		}
		case 'helper-buttons': {
			return (
				<Button
					type="normal"
					label={unwrapLabel(label, 'helper-buttons')}
					iconLeft={icon}
					onClick={() => onSelect('helper-buttons')}
				/>
			)
		}
		default: {
			return null
		}
	}
}
