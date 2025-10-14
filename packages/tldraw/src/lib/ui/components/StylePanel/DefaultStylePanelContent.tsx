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
	TLArrowShapeArrowheadStyle,
	kickoutOccludedShapes,
	minBy,
	useEditor,
	useValue,
} from '@tldraw/editor'
import React from 'react'
import { STYLES } from '../../../styles'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiSlider } from '../primitives/TldrawUiSlider'
import { TldrawUiToolbar, TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'
import { StylePanelButtonPicker, StylePanelButtonPickerInline } from './StylePanelButtonPicker'
import { useStylePanelContext } from './StylePanelContext'
import { StylePanelDoubleDropdownPicker } from './StylePanelDoubleDropdownPicker'
import {
	StylePanelDropdownPicker,
	StylePanelDropdownPickerInline,
} from './StylePanelDropdownPicker'
import { StylePanelSubheading } from './StylePanelSubheading'

/** @public @react */
export function DefaultStylePanelContent() {
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
	const { onHistoryMark, enhancedA11yMode } = useStylePanelContext()

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
		<>
			{enhancedA11yMode && (
				<StylePanelSubheading>{msg('style-panel.opacity')}</StylePanelSubheading>
			)}
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
		</>
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
	const { styles, enhancedA11yMode } = useStylePanelContext()
	const msg = useTranslation()
	const textAlign = styles.get(DefaultTextAlignStyle)
	if (textAlign === undefined) return null
	const title = msg('style-panel.align')

	return (
		<>
			{enhancedA11yMode && <StylePanelSubheading>{title}</StylePanelSubheading>}
			<TldrawUiToolbar orientation="horizontal" label={title}>
				<StylePanelButtonPickerInline
					title={title}
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
		</>
	)
}

/** @public @react */
export function StylePanelLabelAlignPicker() {
	const { styles, enhancedA11yMode } = useStylePanelContext()
	const msg = useTranslation()
	const labelAlign = styles.get(DefaultHorizontalAlignStyle)
	const verticalLabelAlign = styles.get(DefaultVerticalAlignStyle)
	if (labelAlign === undefined) return null
	const title = msg('style-panel.label-align')

	return (
		<>
			{enhancedA11yMode && <StylePanelSubheading>{title}</StylePanelSubheading>}
			<TldrawUiToolbar orientation="horizontal" label={title}>
				<StylePanelButtonPickerInline
					title={title}
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
					<StylePanelDropdownPickerInline
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
		</>
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
