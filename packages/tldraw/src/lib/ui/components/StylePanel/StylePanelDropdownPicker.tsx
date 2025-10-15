import { SharedStyle, StyleProp, tlmenus, useEditor } from '@tldraw/editor'
import * as React from 'react'
import { StyleValuesForUi } from '../../../styles'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../../icon-types'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from '../primitives/Button/TldrawUiButtonLabel'
import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
} from '../primitives/TldrawUiPopover'
import { TldrawUiToolbar, TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { useStylePanelContext } from './StylePanelContext'

/** @public */
export interface StylePanelDropdownPickerProps<T extends string> {
	id: string
	label?: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	uiType: string
	stylePanelType: string
	style: StyleProp<T>
	value: SharedStyle<T>
	items: StyleValuesForUi<T>
	type: 'icon' | 'tool' | 'menu'
	onValueChange?(style: StyleProp<T>, value: T): void
}

function StylePanelDropdownPickerInner<T extends string>(props: StylePanelDropdownPickerProps<T>) {
	const msg = useTranslation()
	const toolbarLabel = props.label
		? msg(props.label)
		: msg(`style-panel.${props.stylePanelType}` as TLUiTranslationKey)
	return (
		<TldrawUiToolbar label={toolbarLabel}>
			<StylePanelDropdownPickerInline {...props} />
		</TldrawUiToolbar>
	)
}

function StylePanelDropdownPickerInlineInner<T extends string>(
	props: StylePanelDropdownPickerProps<T>
) {
	const ctx = useStylePanelContext()
	const {
		id,
		label,
		uiType,
		stylePanelType,
		style,
		items,
		type,
		value,
		onValueChange = ctx.onValueChange,
	} = props
	const msg = useTranslation()
	const editor = useEditor()
	const [isOpen, setIsOpen] = React.useState(false)

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

	const popoverId = `style panel ${id}`
	return (
		<TldrawUiPopover
			id={popoverId}
			open={isOpen}
			onOpenChange={setIsOpen}
			className="tlui-style-panel__dropdown-picker"
		>
			<TldrawUiPopoverTrigger>
				<TldrawUiToolbarButton
					type={type}
					data-testid={`style.${uiType}`}
					data-direction="left"
					title={titleStr}
				>
					{labelStr && <TldrawUiButtonLabel>{labelStr}</TldrawUiButtonLabel>}
					<TldrawUiButtonIcon icon={(icon as TLUiIconType) ?? 'mixed'} />
				</TldrawUiToolbarButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent side="left" align="center">
				<TldrawUiToolbar orientation={items.length > 4 ? 'grid' : 'horizontal'} label={labelStr}>
					<TldrawUiMenuContextProvider type="icons" sourceId="style-panel">
						{items.map((item) => {
							return (
								<TldrawUiToolbarButton
									key={item.value}
									type="icon"
									data-testid={`style.${uiType}.${item.value}`}
									title={
										stylePanelName +
										' — ' +
										msg(`${uiType}-style.${item.value}` as TLUiTranslationKey)
									}
									isActive={icon === item.icon}
									onClick={() => {
										ctx.onHistoryMark('select style dropdown item')
										onValueChange(style, item.value)
										tlmenus.deleteOpenMenu(popoverId, editor.contextId)
										setIsOpen(false)
									}}
								>
									<TldrawUiButtonIcon icon={item.icon} />
								</TldrawUiToolbarButton>
							)
						})}
					</TldrawUiMenuContextProvider>
				</TldrawUiToolbar>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}

// need to export like this to get generics
/** @public @react */
export const StylePanelDropdownPicker = React.memo(StylePanelDropdownPickerInner) as <
	T extends string,
>(
	props: StylePanelDropdownPickerProps<T>
) => React.JSX.Element

/** @public @react */
export const StylePanelDropdownPickerInline = React.memo(StylePanelDropdownPickerInlineInner) as <
	T extends string,
>(
	props: StylePanelDropdownPickerProps<T>
) => React.JSX.Element
