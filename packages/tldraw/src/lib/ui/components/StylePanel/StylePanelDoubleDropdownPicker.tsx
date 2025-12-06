import { SharedStyle, StyleProp, tlmenus, useEditor } from '@tldraw/editor'
import * as React from 'react'
import { StyleValuesForUi } from '../../../styles'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
} from '../primitives/TldrawUiPopover'
import { TldrawUiToolbar, TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
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
	const editor = useEditor()
	const msg = useTranslation()
	const [isOpenA, setIsOpenA] = React.useState(false)
	const [isOpenB, setIsOpenB] = React.useState(false)

	const iconA = React.useMemo(
		() =>
			itemsA.find((item) => valueA.type === 'shared' && valueA.value === item.value)?.icon ??
			'mixed',
		[itemsA, valueA]
	)
	const iconB = React.useMemo(
		() =>
			itemsB.find((item) => valueB.type === 'shared' && valueB.value === item.value)?.icon ??
			'mixed',
		[itemsB, valueB]
	)

	if (valueA === undefined && valueB === undefined) return null

	const idA = `style panel ${uiTypeA} A`
	const idB = `style panel ${uiTypeB} B`
	return (
		<>
			<TldrawUiPopover id={idA} open={isOpenA} onOpenChange={setIsOpenA}>
				<TldrawUiPopoverTrigger>
					<TldrawUiToolbarButton
						type="icon"
						data-testid={`style.${uiTypeA}`}
						title={
							msg(labelA) +
							' — ' +
							(valueA === null || valueA.type === 'mixed'
								? msg('style-panel.mixed')
								: msg(`${uiTypeA}-style.${valueA.value}` as TLUiTranslationKey))
						}
					>
						<TldrawUiButtonIcon icon={iconA} small invertIcon />
					</TldrawUiToolbarButton>
				</TldrawUiPopoverTrigger>
				<TldrawUiPopoverContent side="left" align="center" sideOffset={80} alignOffset={0}>
					<TldrawUiToolbar orientation="grid" label={msg(labelA)}>
						<TldrawUiMenuContextProvider type="icons" sourceId="style-panel">
							{itemsA.map((item) => {
								return (
									<TldrawUiToolbarButton
										data-testid={`style.${uiTypeA}.${item.value}`}
										type="icon"
										key={item.value}
										onClick={() => {
											onValueChange(styleA, item.value)
											tlmenus.deleteOpenMenu(idA, editor.contextId)
											setIsOpenA(false)
										}}
										title={`${msg(labelA)} — ${msg(`${uiTypeA}-style.${item.value}`)}`}
									>
										<TldrawUiButtonIcon icon={item.icon} invertIcon />
									</TldrawUiToolbarButton>
								)
							})}
						</TldrawUiMenuContextProvider>
					</TldrawUiToolbar>
				</TldrawUiPopoverContent>
			</TldrawUiPopover>
			<TldrawUiPopover id={idB} open={isOpenB} onOpenChange={setIsOpenB}>
				<TldrawUiPopoverTrigger>
					<TldrawUiToolbarButton
						type="icon"
						data-testid={`style.${uiTypeB}`}
						title={
							msg(labelB) +
							' — ' +
							(valueB === null || valueB.type === 'mixed'
								? msg('style-panel.mixed')
								: msg(`${uiTypeB}-style.${valueB.value}` as TLUiTranslationKey))
						}
					>
						<TldrawUiButtonIcon icon={iconB} small />
					</TldrawUiToolbarButton>
				</TldrawUiPopoverTrigger>
				<TldrawUiPopoverContent side="left" align="center" sideOffset={116} alignOffset={0}>
					<TldrawUiToolbar orientation="grid" label={msg(labelB)}>
						<TldrawUiMenuContextProvider type="icons" sourceId="style-panel">
							{itemsB.map((item) => {
								return (
									<TldrawUiToolbarButton
										key={item.value}
										type="icon"
										title={`${msg(labelB)} — ${msg(`${uiTypeB}-style.${item.value}` as TLUiTranslationKey)}`}
										data-testid={`style.${uiTypeB}.${item.value}`}
										onClick={() => {
											onValueChange(styleB, item.value)
											tlmenus.deleteOpenMenu(idB, editor.contextId)
											setIsOpenB(false)
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
		</>
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
