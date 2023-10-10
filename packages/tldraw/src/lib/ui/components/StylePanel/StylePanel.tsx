import {
	ArrowShapeArrowheadEndStyle,
	ArrowShapeArrowheadStartStyle,
	DefaultColorStyle,
	DefaultDashStyle,
	DefaultFillStyle,
	DefaultFontStyle,
	DefaultHorizontalAlignStyle,
	DefaultSizeStyle,
	DefaultVerticalAlignStyle,
	GeoShapeGeoStyle,
	LineShapeSplineStyle,
	ReadonlySharedStyleMap,
	SharedStyle,
	StyleProp,
	minBy,
	useEditor,
} from '@tldraw/editor'
import React, { useCallback } from 'react'
import { useRelevantStyles } from '../../hooks/useRevelantStyles'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Button } from '../primitives/Button'
import { ButtonPicker } from '../primitives/ButtonPicker'
import { Slider } from '../primitives/Slider'
import { DoubleDropdownPicker } from './DoubleDropdownPicker'
import { DropdownPicker } from './DropdownPicker'
import { STYLES } from './styles'

interface StylePanelProps {
	isMobile?: boolean
}

/** @internal */
export const StylePanel = function StylePanel({ isMobile }: StylePanelProps) {
	const editor = useEditor()

	const relevantStyles = useRelevantStyles()

	const handlePointerOut = useCallback(() => {
		if (!isMobile) {
			editor.updateInstanceState({ isChangingStyle: false })
		}
	}, [editor, isMobile])

	if (!relevantStyles) return null

	const { styles, opacity } = relevantStyles
	const geo = styles.get(GeoShapeGeoStyle)
	const arrowheadEnd = styles.get(ArrowShapeArrowheadEndStyle)
	const arrowheadStart = styles.get(ArrowShapeArrowheadStartStyle)
	const spline = styles.get(LineShapeSplineStyle)
	const font = styles.get(DefaultFontStyle)

	const hideGeo = geo === undefined
	const hideArrowHeads = arrowheadEnd === undefined && arrowheadStart === undefined
	const hideSpline = spline === undefined
	const hideText = font === undefined

	return (
		<div className="tlui-style-panel" data-ismobile={isMobile} onPointerLeave={handlePointerOut}>
			<CommonStylePickerSet styles={styles} opacity={opacity} />
			{!hideText && <TextStylePickerSet styles={styles} />}
			{!(hideGeo && hideArrowHeads && hideSpline) && (
				<div className="tlui-style-panel__section" aria-label="style panel styles">
					<GeoStylePickerSet styles={styles} />
					<ArrowheadStylePickerSet styles={styles} />
					<SplineStylePickerSet styles={styles} />
				</div>
			)}
		</div>
	)
}

function useStyleChangeCallback() {
	const editor = useEditor()

	return React.useMemo(() => {
		return function handleStyleChange<T>(style: StyleProp<T>, value: T, squashing: boolean) {
			editor.batch(() => {
				if (editor.isIn('select')) {
					editor.setStyleForSelectedShapes(style, value, { squashing })
				}
				editor.setStyleForNextShapes(style, value, { squashing })
				editor.updateInstanceState({ isChangingStyle: true })
			})
		}
	}, [editor])
}

const tldrawSupportedOpacities = [0.1, 0.25, 0.5, 0.75, 1] as const

function CommonStylePickerSet({
	styles,
	opacity,
}: {
	styles: ReadonlySharedStyleMap
	opacity: SharedStyle<number>
}) {
	const editor = useEditor()
	const msg = useTranslation()

	const handleValueChange = useStyleChangeCallback()

	const handleOpacityValueChange = React.useCallback(
		(value: number, ephemeral: boolean) => {
			const item = tldrawSupportedOpacities[value]
			editor.batch(() => {
				if (editor.isIn('select')) {
					editor.setOpacityForSelectedShapes(item, { ephemeral })
				}
				editor.setOpacityForNextShapes(item, { ephemeral })
				editor.updateInstanceState({ isChangingStyle: true })
			})
		},
		[editor]
	)

	const color = styles.get(DefaultColorStyle)
	const fill = styles.get(DefaultFillStyle)
	const dash = styles.get(DefaultDashStyle)
	const size = styles.get(DefaultSizeStyle)

	const showPickers = fill !== undefined || dash !== undefined || size !== undefined

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
			<div
				tabIndex={-1}
				className="tlui-style-panel__section__common"
				aria-label="style panel styles"
			>
				{color === undefined ? null : (
					<ButtonPicker
						title={msg('style-panel.color')}
						uiType="color"
						style={DefaultColorStyle}
						items={STYLES.color}
						value={color}
						onValueChange={handleValueChange}
					/>
				)}
				{opacity === undefined ? null : (
					<Slider
						data-testid="style.opacity"
						value={opacityIndex >= 0 ? opacityIndex : tldrawSupportedOpacities.length - 1}
						label={
							opacity.type === 'mixed' ? 'style-panel.mixed' : `opacity-style.${opacity.value}`
						}
						onValueChange={handleOpacityValueChange}
						steps={tldrawSupportedOpacities.length - 1}
						title={msg('style-panel.opacity')}
					/>
				)}
			</div>
			{showPickers && (
				<div className="tlui-style-panel__section" aria-label="style panel styles">
					{fill === undefined ? null : (
						<ButtonPicker
							title={msg('style-panel.fill')}
							uiType="fill"
							style={DefaultFillStyle}
							items={STYLES.fill}
							value={fill}
							onValueChange={handleValueChange}
						/>
					)}
					{dash === undefined ? null : (
						<ButtonPicker
							title={msg('style-panel.dash')}
							uiType="dash"
							style={DefaultDashStyle}
							items={STYLES.dash}
							value={dash}
							onValueChange={handleValueChange}
						/>
					)}
					{size === undefined ? null : (
						<ButtonPicker
							title={msg('style-panel.size')}
							uiType="size"
							style={DefaultSizeStyle}
							items={STYLES.size}
							value={size}
							onValueChange={handleValueChange}
						/>
					)}
				</div>
			)}
		</>
	)
}

function TextStylePickerSet({ styles }: { styles: ReadonlySharedStyleMap }) {
	const msg = useTranslation()
	const handleValueChange = useStyleChangeCallback()

	const font = styles.get(DefaultFontStyle)
	const align = styles.get(DefaultHorizontalAlignStyle)
	const verticalAlign = styles.get(DefaultVerticalAlignStyle)
	if (font === undefined && align === undefined) {
		return null
	}

	return (
		<div className="tlui-style-panel__section" aria-label="style panel text">
			{font === undefined ? null : (
				<ButtonPicker
					title={msg('style-panel.font')}
					uiType="font"
					style={DefaultFontStyle}
					items={STYLES.font}
					value={font}
					onValueChange={handleValueChange}
				/>
			)}

			{align === undefined ? null : (
				<div className="tlui-style-panel__row">
					<ButtonPicker
						title={msg('style-panel.align')}
						uiType="align"
						style={DefaultHorizontalAlignStyle}
						items={STYLES.horizontalAlign}
						value={align}
						onValueChange={handleValueChange}
					/>
					{verticalAlign === undefined ? (
						<Button
							title={msg('style-panel.vertical-align')}
							data-testid="vertical-align"
							icon="vertical-align-center"
							disabled
						/>
					) : (
						<DropdownPicker
							id="geo-vertical-alignment"
							uiType="verticalAlign"
							style={DefaultVerticalAlignStyle}
							items={STYLES.verticalAlign}
							value={verticalAlign}
							onValueChange={handleValueChange}
						/>
					)}
				</div>
			)}
		</div>
	)
}

function GeoStylePickerSet({ styles }: { styles: ReadonlySharedStyleMap }) {
	const handleValueChange = useStyleChangeCallback()

	const geo = styles.get(GeoShapeGeoStyle)
	if (geo === undefined) {
		return null
	}

	return (
		<DropdownPicker
			id="geo"
			label={'style-panel.geo'}
			uiType="geo"
			style={GeoShapeGeoStyle}
			items={STYLES.geo}
			value={geo}
			onValueChange={handleValueChange}
		/>
	)
}

function SplineStylePickerSet({ styles }: { styles: ReadonlySharedStyleMap }) {
	const handleValueChange = useStyleChangeCallback()

	const spline = styles.get(LineShapeSplineStyle)
	if (spline === undefined) {
		return null
	}

	return (
		<DropdownPicker
			id="spline"
			label={'style-panel.spline'}
			uiType="spline"
			style={LineShapeSplineStyle}
			items={STYLES.spline}
			value={spline}
			onValueChange={handleValueChange}
		/>
	)
}

function ArrowheadStylePickerSet({ styles }: { styles: ReadonlySharedStyleMap }) {
	const handleValueChange = useStyleChangeCallback()

	const arrowheadEnd = styles.get(ArrowShapeArrowheadEndStyle)
	const arrowheadStart = styles.get(ArrowShapeArrowheadStartStyle)
	if (!arrowheadEnd || !arrowheadStart) {
		return null
	}

	return (
		<DoubleDropdownPicker
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
