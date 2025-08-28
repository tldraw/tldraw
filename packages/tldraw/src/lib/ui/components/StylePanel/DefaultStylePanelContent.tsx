import {
	ArrowShapeArrowheadEndStyle,
	ArrowShapeArrowheadStartStyle,
	ArrowShapeKindStyle,
	DefaultColorStyle,
	DefaultDashStyle,
	DefaultFillStyle,
	DefaultFontStyle,
	DefaultHorizontalAlignStyle,
	DefaultSizeStyle,
	DefaultTextAlignStyle,
	DefaultVerticalAlignStyle,
	GeoShapeGeoStyle,
	LineShapeSplineStyle,
	ReadonlySharedStyleMap,
	StyleProp,
	TLArrowShapeArrowheadStyle,
	kickoutOccludedShapes,
	minBy,
	useEditor,
	useValue,
} from '@tldraw/editor'
import React, { createContext, useCallback, useContext } from 'react'
import { STYLES } from '../../../styles'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiSlider } from '../primitives/TldrawUiSlider'
import { TldrawUiToolbar, TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'
import { StylePanelButtonPicker } from './StylePanelButtonPicker'
import { StylePanelDoubleDropdownPicker } from './StylePanelDoubleDropdownPicker'
import { StylePanelDropdownPicker } from './StylePanelDropdownPicker'

/** @public */
export interface StylePanelContext {
	styles: ReadonlySharedStyleMap
	showUiLabels: boolean
	onHistoryMark(id: string): void
	onValueChange<T>(style: StyleProp<T>, value: T): void
}
const StyleContext = createContext<null | StylePanelContext>(null)

/** @public */
export interface StylePanelContextProviderProps {
	children: React.ReactNode
	styles: ReadonlySharedStyleMap | null
}

/** @public @react */
export function StylePanelContextProvider({ children, styles }: StylePanelContextProviderProps) {
	const editor = useEditor()
	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])
	const showUiLabels = useValue('showUiLabels', () => editor.user.getShowUiLabels(), [editor])
	const onValueChange = useStyleChangeCallback()

	return (
		<StyleContext.Provider
			value={{
				styles: styles ?? new ReadonlySharedStyleMap(),
				showUiLabels,
				onHistoryMark,
				onValueChange,
			}}
		>
			{children}
		</StyleContext.Provider>
	)
}

/** @public */
export function useStylePanelContext() {
	const context = useContext(StyleContext)
	if (!context) {
		throw new Error('useStylePanelContext must be used within a StylePanelContextProvider')
	}
	return context
}

/** @public @react */
export function DefaultStylePanelContent() {
	const { styles } = useStylePanelContext()
	if (!styles) return null

	return (
		<>
			<StylePanelSection>
				<StylePanelColorPicker />
				<StylePanelOpacityPicker />
			</StylePanelSection>
			<StylePanelSection>
				<StylePanelFillPicker />
				<StylePanelDashPicker />
				<StylePanelSizePicker />
			</StylePanelSection>
			<StylePanelSection>
				<StylePanelFontPicker />
				<StylePanelTextAlignPicker />
				<StylePanelLabelAlignPicker />
			</StylePanelSection>
			<StylePanelSection>
				<StylePanelGeoShapePicker />
				<StylePanelArrowKindPicker />
				<StylePanelArrowheadPicker />
				<StylePanelSplinePicker />
			</StylePanelSection>
		</>
	)
}

function useStyleChangeCallback() {
	const editor = useEditor()
	const trackEvent = useUiEvents()

	return React.useMemo(
		() =>
			function handleStyleChange<T>(style: StyleProp<T>, value: T) {
				editor.run(() => {
					if (editor.isIn('select')) {
						editor.setStyleForSelectedShapes(style, value)
					}
					editor.setStyleForNextShapes(style, value)
					editor.updateInstanceState({ isChangingStyle: true })
				})

				trackEvent('set-style', { source: 'style-panel', id: style.id, value: value as string })
			},
		[editor, trackEvent]
	)
}

/** @public */
export interface StylePanelSectionProps {
	children: React.ReactNode
}

/** @public @react */
export function StylePanelSection({ children }: StylePanelSectionProps) {
	return <div className="tlui-style-panel__section">{children}</div>
}

/** @public @react */
export function StylePanelColorPicker() {
	const { styles } = useStylePanelContext()
	const msg = useTranslation()
	const color = styles.get(DefaultColorStyle)
	if (color === undefined) return null

	return (
		<StylePanelButtonPicker
			title={msg('style-panel.color')}
			uiType="color"
			style={DefaultColorStyle}
			items={STYLES.color}
			value={color}
		/>
	)
}

const tldrawSupportedOpacities = [0.1, 0.25, 0.5, 0.75, 1] as const
/** @public @react */
export function StylePanelOpacityPicker() {
	const editor = useEditor()
	const { onHistoryMark } = useStylePanelContext()

	const opacity = useValue('opacity', () => editor.getSharedOpacity(), [editor])
	const trackEvent = useUiEvents()
	const msg = useTranslation()

	const handleOpacityValueChange = React.useCallback(
		(value: number) => {
			const item = tldrawSupportedOpacities[value]
			editor.run(() => {
				if (editor.isIn('select')) {
					editor.setOpacityForSelectedShapes(item)
				}
				editor.setOpacityForNextShapes(item)
				editor.updateInstanceState({ isChangingStyle: true })
			})

			trackEvent('set-style', { source: 'style-panel', id: 'opacity', value })
		},
		[editor, trackEvent]
	)

	if (opacity === undefined) return null

	const opacityIndex =
		opacity.type === 'mixed'
			? -1
			: tldrawSupportedOpacities.indexOf(
					minBy(tldrawSupportedOpacities, (supportedOpacity) =>
						Math.abs(supportedOpacity - opacity.value)
					)!
				)

	return (
		<TldrawUiSlider
			data-testid="style.opacity"
			value={opacityIndex >= 0 ? opacityIndex : tldrawSupportedOpacities.length - 1}
			label={opacity.type === 'mixed' ? 'style-panel.mixed' : `opacity-style.${opacity.value}`}
			onValueChange={handleOpacityValueChange}
			steps={tldrawSupportedOpacities.length - 1}
			title={msg('style-panel.opacity')}
			onHistoryMark={onHistoryMark}
			ariaValueModifier={25}
		/>
	)
}

/** @public @react */
export function StylePanelFillPicker() {
	const { styles } = useStylePanelContext()
	const msg = useTranslation()
	const fill = styles.get(DefaultFillStyle)
	if (fill === undefined) return null

	return (
		<StylePanelButtonPicker
			title={msg('style-panel.fill')}
			uiType="fill"
			style={DefaultFillStyle}
			items={STYLES.fill}
			value={fill}
		/>
	)
}

/** @public @react */
export function StylePanelDashPicker() {
	const { styles } = useStylePanelContext()
	const msg = useTranslation()
	const dash = styles.get(DefaultDashStyle)
	if (dash === undefined) return null

	return (
		<StylePanelButtonPicker
			title={msg('style-panel.dash')}
			uiType="dash"
			style={DefaultDashStyle}
			items={STYLES.dash}
			value={dash}
		/>
	)
}

/** @public @react */
export function StylePanelSizePicker() {
	const editor = useEditor()
	const { styles, onValueChange } = useStylePanelContext()
	const msg = useTranslation()
	const size = styles.get(DefaultSizeStyle)
	if (size === undefined) return null

	return (
		<StylePanelButtonPicker
			title={msg('style-panel.size')}
			uiType="size"
			style={DefaultSizeStyle}
			items={STYLES.size}
			value={size}
			onValueChange={(style, value) => {
				onValueChange(style, value)
				const selectedShapeIds = editor.getSelectedShapeIds()
				if (selectedShapeIds.length > 0) {
					kickoutOccludedShapes(editor, selectedShapeIds)
				}
			}}
		/>
	)
}

/** @public @react */
export function StylePanelFontPicker() {
	const { styles } = useStylePanelContext()
	const msg = useTranslation()
	const font = styles.get(DefaultFontStyle)
	if (font === undefined) return null

	return (
		<StylePanelButtonPicker
			title={msg('style-panel.font')}
			uiType="font"
			style={DefaultFontStyle}
			items={STYLES.font}
			value={font}
		/>
	)
}

/** @public @react */
export function StylePanelTextAlignPicker() {
	const { styles } = useStylePanelContext()
	const msg = useTranslation()
	const textAlign = styles.get(DefaultTextAlignStyle)
	if (textAlign === undefined) return null

	return (
		<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.align')}>
			<StylePanelButtonPicker
				title={msg('style-panel.align')}
				uiType="align"
				style={DefaultTextAlignStyle}
				items={STYLES.textAlign}
				value={textAlign}
			/>
			<TldrawUiToolbarButton
				type="icon"
				title={msg('style-panel.vertical-align')}
				data-testid="vertical-align"
				disabled
			>
				<TldrawUiButtonIcon icon="vertical-align-middle" />
			</TldrawUiToolbarButton>
		</TldrawUiToolbar>
	)
}

/** @public @react */
export function StylePanelLabelAlignPicker() {
	const { styles } = useStylePanelContext()
	const msg = useTranslation()
	const labelAlign = styles.get(DefaultHorizontalAlignStyle)
	const verticalLabelAlign = styles.get(DefaultVerticalAlignStyle)
	if (labelAlign === undefined) return null

	return (
		<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.label-align')}>
			<StylePanelButtonPicker
				title={msg('style-panel.label-align')}
				uiType="align"
				style={DefaultHorizontalAlignStyle}
				items={STYLES.horizontalAlign}
				value={labelAlign}
			/>
			{verticalLabelAlign === undefined ? (
				<TldrawUiToolbarButton
					type="icon"
					title={msg('style-panel.vertical-align')}
					data-testid="vertical-align"
					disabled
				>
					<TldrawUiButtonIcon icon="vertical-align-middle" />
				</TldrawUiToolbarButton>
			) : (
				<StylePanelDropdownPicker
					type="icon"
					id="geo-vertical-alignment"
					uiType="verticalAlign"
					stylePanelType="vertical-align"
					style={DefaultVerticalAlignStyle}
					items={STYLES.verticalAlign}
					value={verticalLabelAlign}
				/>
			)}
		</TldrawUiToolbar>
	)
}

/** @public @react */
export function StylePanelGeoShapePicker() {
	const { styles } = useStylePanelContext()
	const geo = styles.get(GeoShapeGeoStyle)
	if (geo === undefined) return null

	return (
		<StylePanelDropdownPicker
			label="style-panel.geo"
			type="menu"
			id="geo"
			uiType="geo"
			stylePanelType="geo"
			style={GeoShapeGeoStyle}
			items={STYLES.geo}
			value={geo}
		/>
	)
}

/** @public @react */
export function StylePanelArrowKindPicker() {
	const { styles } = useStylePanelContext()
	const arrowKind = styles.get(ArrowShapeKindStyle)
	if (arrowKind === undefined) return null

	return (
		<StylePanelDropdownPicker
			id="arrow-kind"
			type="menu"
			label={'style-panel.arrow-kind'}
			uiType="arrow-kind"
			stylePanelType="arrow-kind"
			style={ArrowShapeKindStyle}
			items={STYLES.arrowKind}
			value={arrowKind}
		/>
	)
}

/** @public @react */
export function StylePanelArrowheadPicker() {
	const { styles } = useStylePanelContext()
	const arrowheadEnd = styles.get(ArrowShapeArrowheadEndStyle)
	const arrowheadStart = styles.get(ArrowShapeArrowheadStartStyle)
	if (arrowheadEnd === undefined || arrowheadStart === undefined) return null

	return (
		<StylePanelDoubleDropdownPicker<TLArrowShapeArrowheadStyle>
			label={'style-panel.arrowheads'}
			uiTypeA="arrowheadStart"
			styleA={ArrowShapeArrowheadStartStyle}
			itemsA={STYLES.arrowheadStart}
			valueA={arrowheadStart}
			uiTypeB="arrowheadEnd"
			styleB={ArrowShapeArrowheadEndStyle}
			itemsB={STYLES.arrowheadEnd}
			valueB={arrowheadEnd}
			labelA="style-panel.arrowhead-start"
			labelB="style-panel.arrowhead-end"
		/>
	)
}

/** @public @react */
export function StylePanelSplinePicker() {
	const { styles } = useStylePanelContext()
	const spline = styles.get(LineShapeSplineStyle)
	if (spline === undefined) return null

	return (
		<StylePanelDropdownPicker
			type="menu"
			id="spline"
			uiType="spline"
			stylePanelType="spline"
			label="style-panel.spline"
			style={LineShapeSplineStyle}
			items={STYLES.spline}
			value={spline}
		/>
	)
}
// 	const geo = styles.get(GeoShapeGeoStyle)
// 	const arrowheadEnd = styles.get(ArrowShapeArrowheadEndStyle)
// 	const arrowheadStart = styles.get(ArrowShapeArrowheadStartStyle)
// 	const arrowKind = styles.get(ArrowShapeKindStyle)
// 	const spline = styles.get(LineShapeSplineStyle)
// 	const font = styles.get(DefaultFontStyle)

// 	const hideGeo = geo === undefined
// 	const hideArrowHeads = arrowheadEnd === undefined && arrowheadStart === undefined
// 	const hideSpline = spline === undefined
// 	const hideArrowKind = arrowKind === undefined
// 	const hideText = font === undefined

// 	const theme = getDefaultColorTheme({ isDarkMode: isDarkMode })

// 	return (
// 		<>
// 			<CommonStylePickerSet theme={theme} styles={styles} />
// 			{!hideText && <TextStylePickerSet theme={theme} styles={styles} />}
// 			{!(hideGeo && hideArrowHeads && hideSpline && hideArrowKind) && (
// 				<div className="tlui-style-panel__section">
// 					<GeoStylePickerSet styles={styles} />
// 					<ArrowStylePickerSet styles={styles} />
// 					<ArrowheadStylePickerSet styles={styles} />
// 					<SplineStylePickerSet styles={styles} />
// 				</div>
// 			)}
// 		</>
// 	)
// }

// /** @public */
// export interface ThemeStylePickerSetProps {
// 	styles: ReadonlySharedStyleMap
// 	theme: TLDefaultColorTheme
// }

// /** @public */
// export interface StylePickerSetProps {
// 	styles: ReadonlySharedStyleMap
// }

// /** @public @react */
// export function CommonStylePickerSet({ styles, theme }: ThemeStylePickerSetProps) {
// 	const msg = useTranslation()
// 	const editor = useEditor()

// 	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])
// 	const showUiLabels = useValue('showUiLabels', () => editor.user.getShowUiLabels(), [editor])

// 	const handleValueChange = useStyleChangeCallback()

// 	const color = styles.get(DefaultColorStyle)
// 	const fill = styles.get(DefaultFillStyle)
// 	const dash = styles.get(DefaultDashStyle)
// 	const size = styles.get(DefaultSizeStyle)

// 	const showPickers = fill !== undefined || dash !== undefined || size !== undefined

// 	return (
// 		<>
// 			<div className="tlui-style-panel__section__common" data-testid="style.panel">
// 				{color === undefined ? null : (
// 					<>
// 						{showUiLabels && (
// 							<StylePanelSubheading>{msg('style-panel.color')}</StylePanelSubheading>
// 						)}
// 						<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.color')}>
// 							<TldrawUiButtonPicker
// 								title={msg('style-panel.color')}
// 								uiType="color"
// 								style={DefaultColorStyle}
// 								items={STYLES.color}
// 								value={color}
// 								onValueChange={handleValueChange}
// 								theme={theme}
// 								onHistoryMark={onHistoryMark}
// 							/>
// 						</TldrawUiToolbar>
// 					</>
// 				)}
// 				<OpacitySlider />
// 			</div>
// 			{showPickers && (
// 				<div className="tlui-style-panel__section">
// 					{fill === undefined ? null : (
// 						<>
// 							{showUiLabels && (
// 								<StylePanelSubheading>{msg('style-panel.fill')}</StylePanelSubheading>
// 							)}
// 							<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.fill')}>
// 								<TldrawUiButtonPicker
// 									title={msg('style-panel.fill')}
// 									uiType="fill"
// 									style={DefaultFillStyle}
// 									items={STYLES.fill}
// 									value={fill}
// 									onValueChange={handleValueChange}
// 									theme={theme}
// 									onHistoryMark={onHistoryMark}
// 								/>
// 							</TldrawUiToolbar>
// 						</>
// 					)}
// 					{dash === undefined ? null : (
// 						<>
// 							{showUiLabels && (
// 								<StylePanelSubheading>{msg('style-panel.dash')}</StylePanelSubheading>
// 							)}
// 							<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.dash')}>
// 								<TldrawUiButtonPicker
// 									title={msg('style-panel.dash')}
// 									uiType="dash"
// 									style={DefaultDashStyle}
// 									items={STYLES.dash}
// 									value={dash}
// 									onValueChange={handleValueChange}
// 									theme={theme}
// 									onHistoryMark={onHistoryMark}
// 								/>
// 							</TldrawUiToolbar>
// 						</>
// 					)}
// 					{size === undefined ? null : (
// 						<>
// 							{showUiLabels && (
// 								<StylePanelSubheading>{msg('style-panel.size')}</StylePanelSubheading>
// 							)}
// 							<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.size')}>
// 								<TldrawUiButtonPicker
// 									title={msg('style-panel.size')}
// 									uiType="size"
// 									style={DefaultSizeStyle}
// 									items={STYLES.size}
// 									value={size}
// 									onValueChange={(style, value) => {
// 										handleValueChange(style, value)
// 										const selectedShapeIds = editor.getSelectedShapeIds()
// 										if (selectedShapeIds.length > 0) {
// 											kickoutOccludedShapes(editor, selectedShapeIds)
// 										}
// 									}}
// 									theme={theme}
// 									onHistoryMark={onHistoryMark}
// 								/>
// 							</TldrawUiToolbar>
// 						</>
// 					)}
// 				</div>
// 			)}
// 		</>
// 	)
// }

// /** @public @react */
// export function TextStylePickerSet({ theme, styles }: ThemeStylePickerSetProps) {
// 	const msg = useTranslation()
// 	const handleValueChange = useStyleChangeCallback()

// 	const editor = useEditor()
// 	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])
// 	const showUiLabels = useValue('showUiLabels', () => editor.user.getShowUiLabels(), [editor])
// 	const labelStr = showUiLabels && msg('style-panel.font')

// 	const font = styles.get(DefaultFontStyle)
// 	const textAlign = styles.get(DefaultTextAlignStyle)
// 	const labelAlign = styles.get(DefaultHorizontalAlignStyle)
// 	const verticalLabelAlign = styles.get(DefaultVerticalAlignStyle)
// 	if (font === undefined && labelAlign === undefined) {
// 		return null
// 	}

// 	return (
// 		<div className="tlui-style-panel__section">
// 			{font === undefined ? null : (
// 				<>
// 					{labelStr && <StylePanelSubheading>{labelStr}</StylePanelSubheading>}
// 					<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.font')}>
// 						<TldrawUiButtonPicker
// 							title={msg('style-panel.font')}
// 							uiType="font"
// 							style={DefaultFontStyle}
// 							items={STYLES.font}
// 							value={font}
// 							onValueChange={handleValueChange}
// 							theme={theme}
// 							onHistoryMark={onHistoryMark}
// 						/>
// 					</TldrawUiToolbar>
// 				</>
// 			)}

// 			{textAlign === undefined ? null : (
// 				<>
// 					{showUiLabels && <StylePanelSubheading>{msg('style-panel.align')}</StylePanelSubheading>}
// 					<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.align')}>
// 						<TldrawUiButtonPicker
// 							title={msg('style-panel.align')}
// 							uiType="align"
// 							style={DefaultTextAlignStyle}
// 							items={STYLES.textAlign}
// 							value={textAlign}
// 							onValueChange={handleValueChange}
// 							theme={theme}
// 							onHistoryMark={onHistoryMark}
// 						/>
// 						<TldrawUiToolbarButton
// 							type="icon"
// 							title={msg('style-panel.vertical-align')}
// 							data-testid="vertical-align"
// 							disabled
// 						>
// 							<TldrawUiButtonIcon icon="vertical-align-middle" />
// 						</TldrawUiToolbarButton>
// 					</TldrawUiToolbar>
// 				</>
// 			)}

// 			{labelAlign === undefined ? null : (
// 				<>
// 					{showUiLabels && (
// 						<StylePanelSubheading>{msg('style-panel.label-align')}</StylePanelSubheading>
// 					)}
// 					<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.label-align')}>
// 						<TldrawUiButtonPicker
// 							title={msg('style-panel.label-align')}
// 							uiType="align"
// 							style={DefaultHorizontalAlignStyle}
// 							items={STYLES.horizontalAlign}
// 							value={labelAlign}
// 							onValueChange={handleValueChange}
// 							theme={theme}
// 							onHistoryMark={onHistoryMark}
// 						/>
// 						{verticalLabelAlign === undefined ? (
// 							<TldrawUiToolbarButton
// 								type="icon"
// 								title={msg('style-panel.vertical-align')}
// 								data-testid="vertical-align"
// 								disabled
// 							>
// 								<TldrawUiButtonIcon icon="vertical-align-middle" />
// 							</TldrawUiToolbarButton>
// 						) : (
// 							<DropdownPicker
// 								type="icon"
// 								id="geo-vertical-alignment"
// 								uiType="verticalAlign"
// 								stylePanelType="vertical-align"
// 								style={DefaultVerticalAlignStyle}
// 								items={STYLES.verticalAlign}
// 								value={verticalLabelAlign}
// 								onValueChange={handleValueChange}
// 							/>
// 						)}
// 					</TldrawUiToolbar>
// 				</>
// 			)}
// 		</div>
// 	)
// }
// /** @public @react */
// export function GeoStylePickerSet({ styles }: StylePickerSetProps) {
// 	const msg = useTranslation()
// 	const handleValueChange = useStyleChangeCallback()

// 	const geo = styles.get(GeoShapeGeoStyle)
// 	if (geo === undefined) {
// 		return null
// 	}

// 	return (
// 		<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.geo')}>
// 			<DropdownPicker
// 				id="geo"
// 				type="menu"
// 				label={'style-panel.geo'}
// 				uiType="geo"
// 				stylePanelType="geo"
// 				style={GeoShapeGeoStyle}
// 				items={STYLES.geo}
// 				value={geo}
// 				onValueChange={handleValueChange}
// 			/>
// 		</TldrawUiToolbar>
// 	)
// }
// /** @public @react */
// export function SplineStylePickerSet({ styles }: StylePickerSetProps) {
// 	const msg = useTranslation()
// 	const handleValueChange = useStyleChangeCallback()

// 	const spline = styles.get(LineShapeSplineStyle)
// 	if (spline === undefined) {
// 		return null
// 	}

// 	return (
// 		<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.spline')}>
// 			<DropdownPicker
// 				id="spline"
// 				type="menu"
// 				label={'style-panel.spline'}
// 				uiType="spline"
// 				stylePanelType="spline"
// 				style={LineShapeSplineStyle}
// 				items={STYLES.spline}
// 				value={spline}
// 				onValueChange={handleValueChange}
// 			/>
// 		</TldrawUiToolbar>
// 	)
// }
// /** @public @react */
// export function ArrowStylePickerSet({ styles }: StylePickerSetProps) {
// 	const msg = useTranslation()
// 	const handleValueChange = useStyleChangeCallback()

// 	const arrowKind = styles.get(ArrowShapeKindStyle)
// 	if (arrowKind === undefined) {
// 		return null
// 	}

// 	return (
// 		<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.arrow-kind')}>
// 			<DropdownPicker
// 				id="arrow-kind"
// 				type="menu"
// 				label={'style-panel.arrow-kind'}
// 				uiType="arrow-kind"
// 				stylePanelType="arrow-kind"
// 				style={ArrowShapeKindStyle}
// 				items={STYLES.arrowKind}
// 				value={arrowKind}
// 				onValueChange={handleValueChange}
// 			/>
// 		</TldrawUiToolbar>
// 	)
// }
// /** @public @react */
// export function ArrowheadStylePickerSet({ styles }: StylePickerSetProps) {
// 	const handleValueChange = useStyleChangeCallback()

// 	const arrowheadEnd = styles.get(ArrowShapeArrowheadEndStyle)
// 	const arrowheadStart = styles.get(ArrowShapeArrowheadStartStyle)
// 	if (!arrowheadEnd || !arrowheadStart) {
// 		return null
// 	}

// 	return (
// 		<DoubleDropdownPicker<TLArrowShapeArrowheadStyle>
// 			label={'style-panel.arrowheads'}
// 			uiTypeA="arrowheadStart"
// 			styleA={ArrowShapeArrowheadStartStyle}
// 			itemsA={STYLES.arrowheadStart}
// 			valueA={arrowheadStart}
// 			uiTypeB="arrowheadEnd"
// 			styleB={ArrowShapeArrowheadEndStyle}
// 			itemsB={STYLES.arrowheadEnd}
// 			valueB={arrowheadEnd}
// 			onValueChange={handleValueChange}
// 			labelA="style-panel.arrowhead-start"
// 			labelB="style-panel.arrowhead-end"
// 		/>
// 	)
// }
