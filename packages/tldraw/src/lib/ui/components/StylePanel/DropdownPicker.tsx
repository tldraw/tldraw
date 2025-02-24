import { SharedStyle, StyleProp, useEditor } from '@tldraw/editor'
import classNames from 'classnames'
import * as React from 'react'
import { StyleValuesForUi } from '../../../styles'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { TLUiButtonProps, TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from '../primitives/Button/TldrawUiButtonLabel'
import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
} from '../primitives/TldrawUiPopover'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'

interface DropdownPickerProps<T extends string> {
	id: string
	label?: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	uiType: string
	stylePanelType: string
	style: StyleProp<T>
	value: SharedStyle<T>
	items: StyleValuesForUi<T>
	type: TLUiButtonProps['type']
	onValueChange(style: StyleProp<T>, value: T): void
}

function DropdownPickerInner<T extends string>({
	id,
	label,
	uiType,
	stylePanelType,
	style,
	items,
	type,
	value,
	onValueChange,
}: DropdownPickerProps<T>) {
	const msg = useTranslation()
	const editor = useEditor()

	const icon = React.useMemo(
		() => items.find((item) => value.type === 'shared' && item.value === value.value)?.icon,
		[items, value]
	)

	const stylePanelName = msg(`style-panel.${stylePanelType}` as TLUiTranslationKey)

	const titleStr =
		value.type === 'mixed'
			? msg('style-panel.mixed')
			: stylePanelName + ' — ' + msg(`${uiType}-style.${value.value}` as TLUiTranslationKey)
	const labelStr = label ? msg(label) : ''

	return (
		<TldrawUiPopover id={`style panel ${id}`}>
			<TldrawUiPopoverTrigger>
				<TldrawUiButton type={type} data-testid={`style.${uiType}`} title={titleStr}>
					{labelStr && <TldrawUiButtonLabel>{labelStr}</TldrawUiButtonLabel>}
					<TldrawUiButtonIcon icon={(icon as TLUiIconType) ?? 'mixed'} />
				</TldrawUiButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent side="left" align="center" alignOffset={0}>
				<div className={classNames('tlui-buttons__grid', `tlui-buttons__${stylePanelType}`)}>
					<TldrawUiMenuContextProvider type="icons" sourceId="style-panel">
						{items.map((item) => {
							return (
								<TldrawUiButton
									key={item.value}
									type="icon"
									data-testid={`style.${uiType}.${item.value}`}
									title={
										stylePanelName +
										' — ' +
										msg(`${uiType}-style.${item.value}` as TLUiTranslationKey)
									}
									onClick={() => {
										editor.markHistoryStoppingPoint('select style dropdown item')
										onValueChange(style, item.value)
									}}
								>
									<TldrawUiButtonIcon icon={item.icon} />
								</TldrawUiButton>
							)
						})}
					</TldrawUiMenuContextProvider>
				</div>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}

// need to export like this to get generics
export const DropdownPicker = React.memo(DropdownPickerInner) as typeof DropdownPickerInner
