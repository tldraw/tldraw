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
	TLDefaultColorTheme,
	getColorValue,
	getDefaultColorTheme,
	kickoutOccludedShapes,
	minBy,
	useEditor,
	useIsDarkMode,
	useValue,
} from '@tldraw/editor'
import React, { useCallback, useState } from 'react'
import { STYLES } from '../../../styles'
import { useUiEvents } from '../../context/events'
import { useRelevantStyles } from '../../hooks/useRelevantStyles'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiButtonPicker } from '../primitives/TldrawUiButtonPicker'
import { TldrawUiColorPicker } from '../primitives/TldrawUiColorPicker'
import { TldrawUiSlider } from '../primitives/TldrawUiSlider'
import { TldrawUiToolbar, TldrawUiToolbarButton } from '../primitives/TldrawUiToolbar'
import { DoubleDropdownPicker } from './DoubleDropdownPicker'
import { DropdownPicker } from './DropdownPicker'

// Local component for style panel subheadings
function StylePanelSubheading({ children }: { children: React.ReactNode }) {
	return <h3 className="tlui-style-panel__subheading">{children}</h3>
}

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
	const arrowKind = styles.get(ArrowShapeKindStyle)
	const spline = styles.get(LineShapeSplineStyle)
	const font = styles.get(DefaultFontStyle)

	const hideGeo = geo === undefined
	const hideArrowHeads = arrowheadEnd === undefined && arrowheadStart === undefined
	const hideSpline = spline === undefined
	const hideArrowKind = arrowKind === undefined
	const hideText = font === undefined

	const theme = getDefaultColorTheme({ isDarkMode: isDarkMode })

	return (
		<>
			<CommonStylePickerSet theme={theme} styles={styles} />
			{!(hideGeo && hideArrowHeads && hideSpline && hideArrowKind) && (
				<div className="tlui-style-panel__section">
					<GeoStylePickerSet styles={styles} />
					<ArrowStylePickerSet styles={styles} />
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
	const showUiLabels = useValue('showUiLabels', () => editor.user.getShowUiLabels(), [editor])

	const handleValueChange = useStyleChangeCallback()
	const [isColorSectionExpanded, setIsColorSectionExpanded] = useState(true)
	const [isFillSectionExpanded, setIsFillSectionExpanded] = useState(true)
	const [isDashSectionExpanded, setIsDashSectionExpanded] = useState(true)
	const [isSizeSectionExpanded, setIsSizeSectionExpanded] = useState(true)
	const [isTextSectionExpanded, setIsTextSectionExpanded] = useState(true)

	const color = styles.get(DefaultColorStyle)
	const fill = styles.get(DefaultFillStyle)
	const dash = styles.get(DefaultDashStyle)
	const size = styles.get(DefaultSizeStyle)
	const font = styles.get(DefaultFontStyle)
	const textAlign = styles.get(DefaultTextAlignStyle)
	const labelAlign = styles.get(DefaultHorizontalAlignStyle)
	const verticalLabelAlign = styles.get(DefaultVerticalAlignStyle)

	return (
		<>
			<div data-testid="style.panel">
				{/* Color Session Section */}
				<div
					style={{
						marginTop: '0px',
						marginBottom: '12px',
						background: 'var(--tl-color-panel)',
						borderRadius: '6px',
						border: '1px solid var(--tl-color-border)',
						overflow: 'hidden',
						width: '100%',
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
					}}
				>
					{/* Session Header - Clickable for Expand/Collapse */}
					<div
						onClick={() => setIsColorSectionExpanded(!isColorSectionExpanded)}
						style={{
							padding: '12px 16px',
							background: 'var(--tl-color-muted-1)',
							borderBottom: '1px solid var(--tl-color-border)',
							fontSize: '11px',
							fontWeight: '500',
							color: 'var(--tl-color-text-1)',
							textTransform: 'uppercase',
							letterSpacing: '0.5px',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							userSelect: 'none',
							transition: 'background-color 0.15s ease',
						}}
						onMouseEnter={(e) =>
							(e.currentTarget.style.backgroundColor = 'var(--tl-color-muted-2)')
						}
						onMouseLeave={(e) =>
							(e.currentTarget.style.backgroundColor = 'var(--tl-color-muted-1)')
						}
					>
						<span style={{ fontWeight: '500' }}>Color</span>
						<div
							style={{
								width: '14px',
								height: '14px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								transform: isColorSectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
								transition: 'transform 0.2s ease',
								color: 'var(--tl-color-text-2)',
							}}
						>
							<svg
								width="10"
								height="10"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M6 9L12 15L18 9"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
					</div>

					{/* Session Content - Expandable */}
					{isColorSectionExpanded && (
						<div style={{ padding: '16px' }}>
							{/* Current Color Section */}
							<div style={{ marginBottom: '20px' }}>
								<div
									style={{
										fontSize: '12px',
										fontWeight: '500',
										color: 'var(--tl-color-text-2)',
										marginBottom: '12px',
									}}
								>
									Current Color:
								</div>

								{/* Color Picker Dropdown */}
								{color === undefined ? null : (
									<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.color')}>
										<TldrawUiColorPicker
											title={msg('style-panel.color')}
											value={
												color.type === 'shared'
													? getColorValue(theme, color.value, 'solid')
													: '#000000'
											}
											onValueChange={(newColor) => {
												console.log('Color picker selected:', newColor)
												console.log('Current editor selection:', editor.getSelectedShapeIds())
												console.log('Current color style:', color)

												// Find the closest tldraw color to the hex color
												const hexToRgb = (hex: string) => {
													const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
													return result
														? {
																r: parseInt(result[1], 16),
																g: parseInt(result[2], 16),
																b: parseInt(result[3], 16),
															}
														: null
												}

												const rgbToHsl = (r: number, g: number, b: number) => {
													r /= 255
													g /= 255
													b /= 255

													const max = Math.max(r, g, b)
													const min = Math.min(r, g, b)
													let h = 0
													let s = 0
													const l = (max + min) / 2

													if (max !== min) {
														const d = max - min
														s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

														switch (max) {
															case r:
																h = (g - b) / d + (g < b ? 6 : 0)
																break
															case g:
																h = (b - r) / d + 2
																break
															case b:
																h = (r - g) / d + 4
																break
														}
														h /= 6
													}

													return { h: h * 360, s: s * 100, l: l * 100 }
												}

												const findClosestColor = (hexColor: string) => {
													const targetRgb = hexToRgb(hexColor)
													if (!targetRgb) return 'black'

													const targetHsl = rgbToHsl(targetRgb.r, targetRgb.g, targetRgb.b)

													let closestColor = 'black'
													let minDistance = Infinity

													STYLES.color.forEach((colorStyle) => {
														const colorHex = getColorValue(theme, colorStyle.value, 'solid')
														const colorRgb = hexToRgb(colorHex)
														if (colorRgb) {
															const colorHsl = rgbToHsl(colorRgb.r, colorRgb.g, colorRgb.b)

															// Calculate distance using HSL (more perceptually accurate)
															const hDiff = Math.min(
																Math.abs(targetHsl.h - colorHsl.h),
																360 - Math.abs(targetHsl.h - colorHsl.h)
															)
															const sDiff = Math.abs(targetHsl.s - colorHsl.s)
															const lDiff = Math.abs(targetHsl.l - colorHsl.l)

															const distance = Math.sqrt(
																hDiff * hDiff + sDiff * sDiff + lDiff * lDiff
															)

															if (distance < minDistance) {
																minDistance = distance
																closestColor = colorStyle.value
															}
														}
													})

													return closestColor
												}

												const closestTldrawColor = findClosestColor(newColor)
												console.log('Mapped to tldraw color:', closestTldrawColor)

												// Mark history before changing the color
												onHistoryMark?.('color-picker-change')

												// Apply the color change
												handleValueChange(DefaultColorStyle, closestTldrawColor)

												// Explicitly update the selected shapes to ensure the color change is visible
												const selectedShapeIds = editor.getSelectedShapeIds()
												if (selectedShapeIds.length > 0) {
													console.log(
														'Updating selected shapes with new color:',
														closestTldrawColor
													)
													selectedShapeIds.forEach((shapeId) => {
														const shape = editor.getShape(shapeId)
														if (shape && 'color' in shape.props) {
															editor.updateShape({
																id: shapeId,
																type: shape.type,
																props: {
																	...shape.props,
																	color: closestTldrawColor,
																},
															})
														}
													})
												}

												// Force a repaint to ensure the change is visible
												editor.updateInstanceState({})

												console.log(
													'Color change applied, new selection state:',
													editor.getSelectedShapeIds()
												)
											}}
										/>
									</TldrawUiToolbar>
								)}
							</div>

							{/* Opacity Section */}
							<div>
								<div
									style={{
										fontSize: '12px',
										fontWeight: '500',
										color: 'var(--tl-color-text-2)',
										marginBottom: '8px',
									}}
								>
									Opacity:
								</div>
								<OpacitySlider />
							</div>
						</div>
					)}
				</div>
			</div>
			{/* Fill Session Section */}
			{fill !== undefined && (
				<div
					style={{
						marginTop: '0px',
						marginBottom: '12px',
						background: 'var(--tl-color-panel)',
						borderRadius: '6px',
						border: '1px solid var(--tl-color-border)',
						overflow: 'hidden',
						width: '100%',
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
					}}
				>
					{/* Session Header - Clickable for Expand/Collapse */}
					<div
						onClick={() => setIsFillSectionExpanded(!isFillSectionExpanded)}
						style={{
							padding: '12px 16px',
							background: 'var(--tl-color-muted-1)',
							borderBottom: '1px solid var(--tl-color-border)',
							fontSize: '11px',
							fontWeight: '500',
							color: 'var(--tl-color-text-1)',
							textTransform: 'uppercase',
							letterSpacing: '0.5px',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							userSelect: 'none',
							transition: 'background-color 0.15s ease',
						}}
						onMouseEnter={(e) =>
							(e.currentTarget.style.backgroundColor = 'var(--tl-color-muted-2)')
						}
						onMouseLeave={(e) =>
							(e.currentTarget.style.backgroundColor = 'var(--tl-color-muted-1)')
						}
					>
						<span style={{ fontWeight: '500' }}>Fill</span>
						<div
							style={{
								width: '14px',
								height: '14px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								transform: isFillSectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
								transition: 'transform 0.2s ease',
								color: 'var(--tl-color-text-2)',
							}}
						>
							<svg
								width="10"
								height="10"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M6 9L12 15L18 9"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
					</div>

					{/* Session Content - Expandable */}
					{isFillSectionExpanded && (
						<div style={{ padding: '16px' }}>
							{showUiLabels && (
								<StylePanelSubheading>{msg('style-panel.fill')}</StylePanelSubheading>
							)}
							<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.fill')}>
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
							</TldrawUiToolbar>
						</div>
					)}
				</div>
			)}

			{/* Dash Session Section */}
			{dash !== undefined && (
				<div
					style={{
						marginTop: '0px',
						marginBottom: '12px',
						background: 'var(--tl-color-panel)',
						borderRadius: '6px',
						border: '1px solid var(--tl-color-border)',
						overflow: 'hidden',
						width: '100%',
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
					}}
				>
					{/* Session Header - Clickable for Expand/Collapse */}
					<div
						onClick={() => setIsDashSectionExpanded(!isDashSectionExpanded)}
						style={{
							padding: '12px 16px',
							background: 'var(--tl-color-muted-1)',
							borderBottom: '1px solid var(--tl-color-border)',
							fontSize: '11px',
							fontWeight: '500',
							color: 'var(--tl-color-text-1)',
							textTransform: 'uppercase',
							letterSpacing: '0.5px',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							userSelect: 'none',
							transition: 'background-color 0.15s ease',
						}}
						onMouseEnter={(e) =>
							(e.currentTarget.style.backgroundColor = 'var(--tl-color-muted-2)')
						}
						onMouseLeave={(e) =>
							(e.currentTarget.style.backgroundColor = 'var(--tl-color-muted-1)')
						}
					>
						<span style={{ fontWeight: '500' }}>Dash</span>
						<div
							style={{
								width: '14px',
								height: '14px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								transform: isDashSectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
								transition: 'transform 0.2s ease',
								color: 'var(--tl-color-text-2)',
							}}
						>
							<svg
								width="10"
								height="10"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M6 9L12 15L18 9"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
					</div>

					{/* Session Content - Expandable */}
					{isDashSectionExpanded && (
						<div style={{ padding: '16px' }}>
							{showUiLabels && (
								<StylePanelSubheading>{msg('style-panel.dash')}</StylePanelSubheading>
							)}
							<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.dash')}>
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
							</TldrawUiToolbar>
						</div>
					)}
				</div>
			)}

			{/* Size Session Section */}
			{size !== undefined && (
				<div
					style={{
						marginTop: '0px',
						marginBottom: '12px',
						background: 'var(--tl-color-panel)',
						borderRadius: '6px',
						border: '1px solid var(--tl-color-border)',
						overflow: 'hidden',
						width: '100%',
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
					}}
				>
					{/* Session Header - Clickable for Expand/Collapse */}
					<div
						onClick={() => setIsSizeSectionExpanded(!isSizeSectionExpanded)}
						style={{
							padding: '12px 16px',
							background: 'var(--tl-color-muted-1)',
							borderBottom: '1px solid var(--tl-color-border)',
							fontSize: '11px',
							fontWeight: '500',
							color: 'var(--tl-color-text-1)',
							textTransform: 'uppercase',
							letterSpacing: '0.5px',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							userSelect: 'none',
							transition: 'background-color 0.15s ease',
						}}
						onMouseEnter={(e) =>
							(e.currentTarget.style.backgroundColor = 'var(--tl-color-muted-2)')
						}
						onMouseLeave={(e) =>
							(e.currentTarget.style.backgroundColor = 'var(--tl-color-muted-1)')
						}
					>
						<span style={{ fontWeight: '500' }}>Size</span>
						<div
							style={{
								width: '14px',
								height: '14px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								transform: isSizeSectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
								transition: 'transform 0.2s ease',
								color: 'var(--tl-color-text-2)',
							}}
						>
							<svg
								width="10"
								height="10"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M6 9L12 15L18 9"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
					</div>

					{/* Session Content - Expandable */}
					{isSizeSectionExpanded && (
						<div style={{ padding: '16px' }}>
							{showUiLabels && (
								<StylePanelSubheading>{msg('style-panel.size')}</StylePanelSubheading>
							)}
							<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.size')}>
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
							</TldrawUiToolbar>
						</div>
					)}
				</div>
			)}

			{/* Text Session Section */}
			{(font !== undefined || textAlign !== undefined || labelAlign !== undefined) && (
				<div
					style={{
						marginTop: '0px',
						marginBottom: '12px',
						background: 'var(--tl-color-panel)',
						borderRadius: '6px',
						border: '1px solid var(--tl-color-border)',
						overflow: 'hidden',
						width: '100%',
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
					}}
				>
					{/* Session Header - Clickable for Expand/Collapse */}
					<div
						onClick={() => setIsTextSectionExpanded(!isTextSectionExpanded)}
						style={{
							padding: '12px 16px',
							background: 'var(--tl-color-muted-1)',
							borderBottom: '1px solid var(--tl-color-border)',
							fontSize: '11px',
							fontWeight: '500',
							color: 'var(--tl-color-text-1)',
							textTransform: 'uppercase',
							letterSpacing: '0.5px',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							userSelect: 'none',
							transition: 'background-color 0.15s ease',
						}}
						onMouseEnter={(e) =>
							(e.currentTarget.style.backgroundColor = 'var(--tl-color-muted-2)')
						}
						onMouseLeave={(e) =>
							(e.currentTarget.style.backgroundColor = 'var(--tl-color-muted-1)')
						}
					>
						<span style={{ fontWeight: '500' }}>Text</span>
						<div
							style={{
								width: '14px',
								height: '14px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								transform: isTextSectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
								transition: 'transform 0.2s ease',
								color: 'var(--tl-color-text-2)',
							}}
						>
							<svg
								width="10"
								height="10"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M6 9L12 15L18 9"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
					</div>

					{/* Session Content - Expandable */}
					{isTextSectionExpanded && (
						<div style={{ padding: '16px' }}>
							{/* Font Selection - Dropdown like Word */}
							{font !== undefined && (
								<div style={{ marginBottom: '16px' }}>
									{showUiLabels && (
										<StylePanelSubheading>{msg('style-panel.font')}</StylePanelSubheading>
									)}
									<div
										style={{
											position: 'relative',
											width: '100%',
										}}
									>
										<select
											value={font.type === 'shared' ? font.value : 'serif'}
											onChange={(e) => {
												onHistoryMark?.('font-change')
												handleValueChange(DefaultFontStyle, e.target.value)
											}}
											style={{
												width: '100%',
												padding: '8px 12px',
												border: '1px solid var(--tl-color-border)',
												borderRadius: '4px',
												background: 'var(--tl-color-panel)',
												color: 'var(--tl-color-text-1)',
												fontSize: '12px',
												fontFamily: 'inherit',
												cursor: 'pointer',
												outline: 'none',
												transition: 'border-color 0.15s ease',
												appearance: 'none',
												WebkitAppearance: 'none',
												MozAppearance: 'none',
											}}
											onFocus={(e) => (e.target.style.borderColor = 'var(--tl-color-focus)')}
											onBlur={(e) => (e.target.style.borderColor = 'var(--tl-color-border)')}
										>
											<option value="serif" style={{ fontFamily: 'var(--tl-font-serif)' }}>
												Times New Roman
											</option>
											<option value="draw" style={{ fontFamily: 'var(--tl-font-draw)' }}>
												Draw
											</option>
											<option value="sans" style={{ fontFamily: 'var(--tl-font-sans)' }}>
												Arial
											</option>
											<option value="mono" style={{ fontFamily: 'var(--tl-font-mono)' }}>
												Courier New
											</option>
											<option value="hand" style={{ fontFamily: 'var(--tl-font-hand)' }}>
												Comic Sans MS
											</option>
											<option value="script" style={{ fontFamily: 'var(--tl-font-script)' }}>
												Brush Script MT
											</option>
											<option value="chalk" style={{ fontFamily: 'var(--tl-font-chalk)' }}>
												Chalkboard
											</option>
											<option value="code" style={{ fontFamily: 'var(--tl-font-code)' }}>
												Consolas
											</option>
										</select>
										<div
											style={{
												position: 'absolute',
												right: '8px',
												top: '50%',
												transform: 'translateY(-50%)',
												pointerEvents: 'none',
												color: 'var(--tl-color-text-2)',
												width: '16px',
												height: '16px',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
											}}
										>
											<svg
												width="10"
												height="10"
												viewBox="0 0 24 24"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													d="M6 9L12 15L18 9"
													stroke="currentColor"
													strokeWidth="1.5"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										</div>
									</div>
								</div>
							)}

							{/* Text Alignment */}
							{textAlign !== undefined && (
								<div style={{ marginBottom: '16px' }}>
									{showUiLabels && (
										<StylePanelSubheading>{msg('style-panel.align')}</StylePanelSubheading>
									)}
									<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.align')}>
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
									</TldrawUiToolbar>
								</div>
							)}

							{/* Label Alignment */}
							{labelAlign !== undefined && (
								<div>
									{showUiLabels && (
										<StylePanelSubheading>{msg('style-panel.label-align')}</StylePanelSubheading>
									)}
									<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.label-align')}>
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
									</TldrawUiToolbar>
								</div>
							)}
						</div>
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
	const showUiLabels = useValue('showUiLabels', () => editor.user.getShowUiLabels(), [editor])
	const labelStr = showUiLabels && msg('style-panel.font')

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
				<>
					{labelStr && <StylePanelSubheading>{labelStr}</StylePanelSubheading>}
					<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.font')}>
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
					</TldrawUiToolbar>
				</>
			)}

			{textAlign === undefined ? null : (
				<>
					{showUiLabels && <StylePanelSubheading>{msg('style-panel.align')}</StylePanelSubheading>}
					<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.align')}>
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
			)}

			{labelAlign === undefined ? null : (
				<>
					{showUiLabels && (
						<StylePanelSubheading>{msg('style-panel.label-align')}</StylePanelSubheading>
					)}
					<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.label-align')}>
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
					</TldrawUiToolbar>
				</>
			)}
		</div>
	)
}
/** @public @react */
export function GeoStylePickerSet({ styles }: StylePickerSetProps) {
	const msg = useTranslation()
	const handleValueChange = useStyleChangeCallback()

	const geo = styles.get(GeoShapeGeoStyle)
	if (geo === undefined) {
		return null
	}

	return (
		<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.geo')}>
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
		</TldrawUiToolbar>
	)
}
/** @public @react */
export function SplineStylePickerSet({ styles }: StylePickerSetProps) {
	const msg = useTranslation()
	const handleValueChange = useStyleChangeCallback()

	const spline = styles.get(LineShapeSplineStyle)
	if (spline === undefined) {
		return null
	}

	return (
		<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.spline')}>
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
		</TldrawUiToolbar>
	)
}
/** @public @react */
export function ArrowStylePickerSet({ styles }: StylePickerSetProps) {
	const msg = useTranslation()
	const handleValueChange = useStyleChangeCallback()

	const arrowKind = styles.get(ArrowShapeKindStyle)
	if (arrowKind === undefined) {
		return null
	}

	return (
		<TldrawUiToolbar orientation="horizontal" label={msg('style-panel.arrow-kind')}>
			<DropdownPicker
				id="arrow-kind"
				type="menu"
				label={'style-panel.arrow-kind'}
				uiType="arrow-kind"
				stylePanelType="arrow-kind"
				style={ArrowShapeKindStyle}
				items={STYLES.arrowKind}
				value={arrowKind}
				onValueChange={handleValueChange}
			/>
		</TldrawUiToolbar>
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
	const showUiLabels = useValue('showUiLabels', () => editor.user.getShowUiLabels(), [editor])

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
			{showUiLabels && <StylePanelSubheading>{msg('style-panel.opacity')}</StylePanelSubheading>}
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
