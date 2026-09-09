import { SharedStyle, StyleProp, tlmenus, useEditor } from '@tldraw/editor'
import * as React from 'react'
import { StyleValuesForUi } from '../../../styles'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
} from '../primitives/TldrawUiPopover'
import { TldrawUiToolbar, TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'
import { useStylePanelContext } from './StylePanelContext'

/** @public */
export interface StylePanelDoubleDropdownPickerProps<T extends string> {
	uiTypeA: string
	uiTypeB: string
	label: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	labelA: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	labelB: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	itemsA: StyleValuesForUi<T>
	itemsB: StyleValuesForUi<T>
	styleA: StyleProp<T>
	styleB: StyleProp<T>
	valueA: SharedStyle<T>
	valueB: SharedStyle<T>
	onValueChange?(style: StyleProp<T>, value: T): void
}

function StylePanelDoubleDropdownPickerInner<T extends string>(
	props: StylePanelDoubleDropdownPickerProps<T>
) {
	const msg = useTranslation()
	return (
		<div className="tlui-style-panel__double-select-picker">
			<div title={msg(props.label)} className="tlui-style-panel__double-select-picker-label">
				{msg(props.label)}
			</div>
			<TldrawUiToolbar orientation="horizontal" label={msg(props.label)}>
				<StylePanelDoubleDropdownPickerInline {...props} />
			</TldrawUiToolbar>
		</div>
	)
}

function StylePanelDoubleDropdownPickerInlineInner<T extends string>(
	props: StylePanelDoubleDropdownPickerProps<T>
) {
	const ctx = useStylePanelContext()
	const {
		uiTypeA,
		uiTypeB,
		labelA,
		labelB,
		itemsA,
		itemsB,
		styleA,
		styleB,
		valueA,
		valueB,
		onValueChange = ctx.onValueChange,
	} = props

	if (valueA === undefined && valueB === undefined) return null

	return (
		<>
			<DropdownHalf
				id={`style panel ${uiTypeA} A`}
				uiType={uiTypeA}
				label={labelA}
				items={itemsA}
				style={styleA}
				value={valueA}
				onValueChange={onValueChange}
				sideOffset={80}
				invertIcon
			/>
			<DropdownHalf
				id={`style panel ${uiTypeB} B`}
				uiType={uiTypeB}
				label={labelB}
				items={itemsB}
				style={styleB}
				value={valueB}
				onValueChange={onValueChange}
				sideOffset={116}
			/>
		</>
	)
}

function DropdownHalf<T extends string>({
	id,
	uiType,
	label,
	items,
	style,
	value,
	onValueChange,
	sideOffset,
	invertIcon,
}: {
	id: string
	uiType: string
	label: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	items: StyleValuesForUi<T>
	style: StyleProp<T>
	value: SharedStyle<T>
	onValueChange(style: StyleProp<T>, value: T): void
	sideOffset: number
	invertIcon?: boolean
}) {
	const ctx = useStylePanelContext()
	const editor = useEditor()
	const msg = useTranslation()
	const [isOpen, setIsOpen] = React.useState(false)

	const icon = React.useMemo(
		() =>
			items.find((item) => value.type === 'shared' && value.value === item.value)?.icon ?? 'mixed',
		[items, value]
	)

	return (
		<TldrawUiPopover id={id} open={isOpen} onOpenChange={setIsOpen}>
			<TldrawUiPopoverTrigger>
				<TldrawUiToolbarButton
					type="icon"
					data-testid={`style.${uiType}`}
					title={
						msg(label) +
						' — ' +
						(value === null || value.type === 'mixed'
							? msg('style-panel.mixed')
							: msg(`${uiType}-style.${value.value}` as TLUiTranslationKey))
					}
				>
					<TldrawUiButtonIcon icon={icon} small invertIcon={invertIcon} />
				</TldrawUiToolbarButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent side="left" align="center" sideOffset={sideOffset} alignOffset={0}>
				<TldrawUiToolbar orientation="grid" label={msg(label)}>
					<TldrawUiMenuContextProvider type="icons" sourceId="style-panel">
						{items.map((item) => (
							<TldrawUiToolbarButton
								key={item.value}
								type="icon"
								data-testid={`style.${uiType}.${item.value}`}
								title={`${msg(label)} — ${msg(`${uiType}-style.${item.value}` as TLUiTranslationKey)}`}
								onClick={() => {
									ctx.onHistoryMark('select style dropdown item')
									onValueChange(style, item.value)
									tlmenus.deleteOpenMenu(id, editor.contextId)
									setIsOpen(false)
								}}
							>
								<TldrawUiButtonIcon icon={item.icon} invertIcon={invertIcon} />
							</TldrawUiToolbarButton>
						))}
					</TldrawUiMenuContextProvider>
				</TldrawUiToolbar>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}

// need to memo like this to get generics
/** @public @react */
export const StylePanelDoubleDropdownPicker = React.memo(StylePanelDoubleDropdownPickerInner) as <
	T extends string,
>(
	props: StylePanelDoubleDropdownPickerProps<T>
) => React.JSX.Element

/** @public @react */
export const StylePanelDoubleDropdownPickerInline = React.memo(
	StylePanelDoubleDropdownPickerInlineInner
) as <T extends string>(props: StylePanelDoubleDropdownPickerProps<T>) => React.JSX.Element
