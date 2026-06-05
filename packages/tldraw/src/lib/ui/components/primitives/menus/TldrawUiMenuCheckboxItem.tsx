import { preventDefault } from '@tldraw/editor'
import { ContextMenu as _ContextMenu, DropdownMenu as _DropdownMenu } from 'radix-ui'
import { useId } from 'react'
import { unwrapLabel } from '../../../context/actions'
import { TLUiEventSource } from '../../../context/events'
import { useReadonly } from '../../../hooks/useReadonly'
import { TLUiTranslationKey } from '../../../hooks/useTranslation/TLUiTranslationKey'
import { useDirection, useTranslation } from '../../../hooks/useTranslation/useTranslation'
import { TldrawUiIcon, TLUiIconJsx } from '../TldrawUiIcon'
import { TldrawUiKbd } from '../TldrawUiKbd'
import { TldrawUiTooltip } from '../TldrawUiTooltip'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export interface TLUiMenuCheckboxItemProps<
	TranslationKey extends string = string,
	IconType extends string = string,
> {
	icon?: IconType | TLUiIconJsx
	id: string
	kbd?: string
	title?: string
	label?: TranslationKey | { [key: string]: TranslationKey }
	description?: TranslationKey | { [key: string]: TranslationKey }
	lang?: string
	readonlyOk?: boolean
	onSelect(source: TLUiEventSource): Promise<void> | void
	toggle?: boolean
	checked?: boolean
	disabled?: boolean
}

function MenuCheckboxItemContent({
	checked,
	toggle,
	labelStr,
	kbd,
	descriptionStr,
	descriptionId,
	msg,
}: {
	checked: boolean
	toggle: boolean
	labelStr: string | undefined
	kbd: string | undefined
	descriptionStr: string | undefined
	descriptionId: string
	msg(key: TLUiTranslationKey): string
}) {
	return (
		<>
			<TldrawUiIcon
				small
				label={msg(checked ? 'ui.checked' : 'ui.unchecked')}
				icon={toggle ? (checked ? 'toggle-on' : 'toggle-off') : checked ? 'check' : 'none'}
			/>
			{labelStr && (
				<span className="tlui-button__label" draggable={false}>
					{labelStr}
				</span>
			)}
			{kbd && <TldrawUiKbd>{kbd}</TldrawUiKbd>}
			{descriptionStr && (
				<span id={descriptionId} className="tlui-visually-hidden">
					{descriptionStr}
				</span>
			)}
		</>
	)
}

/** @public @react */
export function TldrawUiMenuCheckboxItem<
	TranslationKey extends string = string,
	IconType extends string = string,
>({
	id,
	kbd,
	title,
	label,
	description,
	lang,
	readonlyOk,
	onSelect,
	toggle = false,
	disabled = false,
	checked = false,
}: TLUiMenuCheckboxItemProps<TranslationKey, IconType>) {
	const { type: menuType, sourceId } = useTldrawUiMenuContext()
	const isReadonlyMode = useReadonly()
	const msg = useTranslation()
	const dir = useDirection()
	const descriptionId = useId()

	// If the editor is in readonly mode and the item is not marked as readonlyok, return null
	if (isReadonlyMode && !readonlyOk) return null

	const labelToUse = unwrapLabel(label, menuType)
	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined
	const descriptionToUse = unwrapLabel(description, menuType)
	const descriptionStr = descriptionToUse ? msg(descriptionToUse as TLUiTranslationKey) : undefined
	const titleStr = descriptionStr ? undefined : (title ?? labelStr)

	const contentProps = {
		checked,
		toggle,
		labelStr,
		kbd,
		descriptionStr,
		descriptionId,
		msg,
	}

	switch (menuType) {
		case 'menu': {
			const item = (
				<_DropdownMenu.CheckboxItem
					dir={dir}
					lang={lang}
					className="tlui-button tlui-button__menu tlui-button__checkbox"
					title={titleStr}
					aria-describedby={descriptionStr ? descriptionId : undefined}
					onSelect={(e) => {
						onSelect?.(sourceId)
						preventDefault(e)
					}}
					disabled={disabled}
					checked={checked}
				>
					<MenuCheckboxItemContent {...contentProps} />
				</_DropdownMenu.CheckboxItem>
			)

			return descriptionStr ? (
				<TldrawUiTooltip content={descriptionStr} side="right">
					{item}
				</TldrawUiTooltip>
			) : (
				item
			)
		}
		case 'context-menu': {
			const item = (
				<_ContextMenu.CheckboxItem
					key={id}
					className="tlui-button tlui-button__menu tlui-button__checkbox"
					dir={dir}
					lang={lang}
					title={titleStr}
					aria-describedby={descriptionStr ? descriptionId : undefined}
					onSelect={(e) => {
						onSelect(sourceId)
						preventDefault(e)
					}}
					disabled={disabled}
					checked={checked}
				>
					<MenuCheckboxItemContent {...contentProps} />
				</_ContextMenu.CheckboxItem>
			)

			return descriptionStr ? (
				<TldrawUiTooltip content={descriptionStr} side="right">
					{item}
				</TldrawUiTooltip>
			) : (
				item
			)
		}
		default: {
			// no checkbox items in actions menu
			return null
		}
	}
}
