import {
	ArrowShapeArrowheadEndStyle,
	ArrowShapeArrowheadStartStyle,
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
	TLDefaultColorTheme,
	getDefaultColorTheme,
	minBy,
	useEditor,
	useIsDarkMode,
	useValue,
} from '@tldraw/editor'
import React, { useCallback } from 'react'
import { STYLES } from '../../../styles'
import { kickoutOccludedShapes } from '../../../tools/SelectTool/selectHelpers'
import { useUiEvents } from '../../context/events'
import { useRelevantStyles } from '../../hooks/useRelevantStyles'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiButtonPicker } from '../primitives/TldrawUiButtonPicker'
import { TldrawUiSlider } from '../primitives/TldrawUiSlider'
import { DoubleDropdownPicker } from './DoubleDropdownPicker'
import { DropdownPicker } from './DropdownPicker'

/** @public */
export interface TLUiStylePanelContentProps {
	styles: ReturnType<typeof useRelevantStyles>
}

/** @public @react */
export function DefaultStylePanelContent({ styles }: TLUiStylePanelContentProps) {
	const isDarkMode = useIsDarkMode()

	if (!styles) return null

	const geo = styles.get(GeoShapeGeoStyle)
	const arrowheadEnd = styles.get(ArrowShapeArrowheadEndStyle)
	const arrowheadStart = styles.get(ArrowShapeArrowheadStartStyle)
	const spline = styles.get(LineShapeSplineStyle)
	const font = styles.get(DefaultFontStyle)

	const hideGeo = geo === undefined
	const hideArrowHeads = arrowheadEnd === undefined && arrowheadStart === undefined
	const hideSpline = spline === undefined
	const hideText = font === undefined

	const theme = getDefaultColorTheme({ isDarkMode: isDarkMode })

	return (
		<>
			<CommonStylePickerSet theme={theme} styles={styles} />
			{!hideText && <TextStylePickerSet theme={theme} styles={styles} />}
			{!(hideGeo && hideArrowHeads && hideSpline) && (
				<div className="tlui-style-panel__section">
					<GeoStylePickerSet styles={styles} />
					<ArrowheadStylePickerSet styles={styles} />
					<SplineStylePickerSet styles={styles} />
				</div>
			)}
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
export interface ThemeStylePickerSetProps {
	styles: ReadonlySharedStyleMap
	theme: TLDefaultColorTheme
}

/** @public */
export interface StylePickerSetProps {
	styles: ReadonlySharedStyleMap
}

/** @public @react */
export function CommonStylePickerSet({ styles, theme }: ThemeStylePickerSetProps) {
	const msg = useTranslation()
	const editor = useEditor()

	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])

	const handleValueChange = useStyleChangeCallback()

	const color = styles.get(DefaultColorStyle)
	const fill = styles.get(DefaultFillStyle)
	const dash = styles.get(DefaultDashStyle)
	const size = styles.get(DefaultSizeStyle)

	const showPickers = fill !== undefined || dash !== undefined || size !== undefined

	return (
		<>
			<div tabIndex={-1} className="tlui-style-panel__section__common" data-testid="style.panel">
				{color === undefined ? null : (
					<TldrawUiButtonPicker
						title={msg('style-panel.color')}
						uiType="color"
						style={DefaultColorStyle}
						items={STYLES.color}
						value={color}
						onValueChange={handleValueChange}
						theme={theme}
						onHistoryMark={onHistoryMark}
					/>
				)}
				<OpacitySlider />
			</div>
			{showPickers && (
				<div className="tlui-style-panel__section">
					{fill === undefined ? null : (
						<TldrawUiButtonPicker
							title={msg('style-panel.fill')}
							uiType="fill"
							style={DefaultFillStyle}
							items={STYLES.fill}
							value={fill}
							onValueChange={handleValueChange}
							theme={theme}
							onHistoryMark={onHistoryMark}
						/>
					)}
					{dash === undefined ? null : (
						<TldrawUiButtonPicker
							title={msg('style-panel.dash')}
							uiType="dash"
							style={DefaultDashStyle}
							items={STYLES.dash}
							value={dash}
							onValueChange={handleValueChange}
							theme={theme}
							onHistoryMark={onHistoryMark}
						/>
					)}
					{size === undefined ? null : (
						<TldrawUiButtonPicker
							title={msg('style-panel.size')}
							uiType="size"
							style={DefaultSizeStyle}
							items={STYLES.size}
							value={size}
							onValueChange={(style, value) => {
								handleValueChange(style, value)
								const selectedShapeIds = editor.getSelectedShapeIds()
								if (selectedShapeIds.length > 0) {
									kickoutOccludedShapes(editor, selectedShapeIds)
								}
							}}
							theme={theme}
							onHistoryMark={onHistoryMark}
						/>
					)}
				</div>
			)}
		</>
	)
}

/** @public @react */
export function TextStylePickerSet({ theme, styles }: ThemeStylePickerSetProps) {
	const msg = useTranslation()
	const handleValueChange = useStyleChangeCallback()

	const editor = useEditor()
	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])

	const font = styles.get(DefaultFontStyle)
	const textAlign = styles.get(DefaultTextAlignStyle)
	const labelAlign = styles.get(DefaultHorizontalAlignStyle)
	const verticalLabelAlign = styles.get(DefaultVerticalAlignStyle)
	if (font === undefined && labelAlign === undefined) {
		return null
	}

	return (
		<div className="tlui-style-panel__section">
			{font === undefined ? null : (
				<TldrawUiButtonPicker
					title={msg('style-panel.font')}
					uiType="font"
					style={DefaultFontStyle}
					items={STYLES.font}
					value={font}
					onValueChange={handleValueChange}
					theme={theme}
					onHistoryMark={onHistoryMark}
				/>
			)}

			{textAlign === undefined ? null : (
				<div className="tlui-style-panel__row">
					<TldrawUiButtonPicker
						title={msg('style-panel.align')}
						uiType="align"
						style={DefaultTextAlignStyle}
						items={STYLES.textAlign}
						value={textAlign}
						onValueChange={handleValueChange}
						theme={theme}
						onHistoryMark={onHistoryMark}
					/>
					<div className="tlui-style-panel__row__extra-button">
						<TldrawUiButton
							type="icon"
							title={msg('style-panel.vertical-align')}
							data-testid="vertical-align"
							disabled
						>
							<TldrawUiButtonIcon icon="vertical-align-middle" />
						</TldrawUiButton>
					</div>
				</div>
			)}

			{labelAlign === undefined ? null : (
				<div className="tlui-style-panel__row">
					<TldrawUiButtonPicker
						title={msg('style-panel.label-align')}
						uiType="align"
						style={DefaultHorizontalAlignStyle}
						items={STYLES.horizontalAlign}
						value={labelAlign}
						onValueChange={handleValueChange}
						theme={theme}
						onHistoryMark={onHistoryMark}
					/>
					<div className="tlui-style-panel__row__extra-button">
						{verticalLabelAlign === undefined ? (
							<TldrawUiButton
								type="icon"
								title={msg('style-panel.vertical-align')}
								data-testid="vertical-align"
								disabled
							>
								<TldrawUiButtonIcon icon="vertical-align-middle" />
							</TldrawUiButton>
						) : (
							<DropdownPicker
								type="icon"
								id="geo-vertical-alignment"
								uiType="verticalAlign"
								stylePanelType="vertical-align"
								style={DefaultVerticalAlignStyle}
								items={STYLES.verticalAlign}
								value={verticalLabelAlign}
								onValueChange={handleValueChange}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
/** @public @react */
export function GeoStylePickerSet({ styles }: StylePickerSetProps) {
	const handleValueChange = useStyleChangeCallback()

	const geo = styles.get(GeoShapeGeoStyle)
	if (geo === undefined) {
		return null
	}

	return (
		<DropdownPicker
			id="geo"
			type="menu"
			label={'style-panel.geo'}
			uiType="geo"
			stylePanelType="geo"
			style={GeoShapeGeoStyle}
			items={STYLES.geo}
			value={geo}
			onValueChange={handleValueChange}
		/>
	)
}
/** @public @react */
export function SplineStylePickerSet({ styles }: StylePickerSetProps) {
	const handleValueChange = useStyleChangeCallback()

	const spline = styles.get(LineShapeSplineStyle)
	if (spline === undefined) {
		return null
	}

	return (
		<DropdownPicker
			id="spline"
			type="menu"
			label={'style-panel.spline'}
			uiType="spline"
			stylePanelType="spline"
			style={LineShapeSplineStyle}
			items={STYLES.spline}
			value={spline}
			onValueChange={handleValueChange}
		/>
	)
}

/** @public @react */
export function ArrowheadStylePickerSet({ styles }: StylePickerSetProps) {
	const handleValueChange = useStyleChangeCallback()

	const arrowheadEnd = styles.get(ArrowShapeArrowheadEndStyle)
	const arrowheadStart = styles.get(ArrowShapeArrowheadStartStyle)
	if (!arrowheadEnd || !arrowheadStart) {
		return null
	}

	return (
		<DoubleDropdownPicker<TLArrowShapeArrowheadStyle>
			label={'style-panel.arrowheads'}
			uiTypeA="arrowheadStart"
			styleA={ArrowShapeArrowheadStartStyle}
			itemsA={STYLES.arrowheadStart}
			valueA={arrowheadStart}
			uiTypeB="arrowheadEnd"
			styleB={ArrowShapeArrowheadEndStyle}
			itemsB={STYLES.arrowheadEnd}
			valueB={arrowheadEnd}
			onValueChange={handleValueChange}
			labelA="style-panel.arrowhead-start"
			labelB="style-panel.arrowhead-end"
		/>
	)
}

const tldrawSupportedOpacities = [0.1, 0.25, 0.5, 0.75, 1] as const
/** @public @react */
export function OpacitySlider() {
	const editor = useEditor()

	const onHistoryMark = useCallback((id: string) => editor.markHistoryStoppingPoint(id), [editor])

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
		/>
	)
}
