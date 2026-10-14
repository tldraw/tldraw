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
	kickoutOccludedShapes,
	LineShapeSplineStyle,
	StyleProp,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { GeoShapeUtil } from '../../../shapes/geo/GeoShapeUtil'
import { defaultGeoTypeDefinitions } from '../../../shapes/geo/getGeoShapePath'
import { getColorStyleItems, getFontStyleItems, STYLES } from '../../../styles'
import { useUiEvents } from '../../context/events'
import { useReadonly } from '../../hooks/useReadonly'
import { useRelevantStyles } from '../../hooks/useRelevantStyles'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuCheckboxItem } from '../primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from '../primitives/menus/TldrawUiMenuSubmenu'

const OPACITIES = [0.1, 0.25, 0.5, 0.75, 1] as const

/**
 * The style panel's styles, one submenu each, for the selection or, with nothing selected, the next
 * shape. Lists only the styles the style panel would show.
 *
 * @public @react
 */
export function CommandPaletteStylesGroup() {
	const editor = useEditor()
	const msg = useTranslation()
	const trackEvent = useUiEvents()
	const isReadonly = useReadonly()
	const styles = useRelevantStyles()
	const opacity = useValue('opacity', () => editor.getSharedOpacity(), [editor])
	const colors = useValue(
		'color items',
		() => getColorStyleItems(editor.getCurrentTheme().colors[editor.getColorMode()]),
		[editor]
	)
	const fonts = useValue('font items', () => getFontStyleItems(editor.getCurrentTheme()), [editor])
	if (isReadonly || !styles) return null

	const geoTypes = Object.keys({
		...defaultGeoTypeDefinitions,
		...editor.getShapeUtil<GeoShapeUtil>('geo').options.customGeoTypes,
	})

	function setStyle<T>(style: StyleProp<T>, value: T) {
		editor.run(() => {
			editor.markHistoryStoppingPoint('set style')
			if (editor.isIn('select')) editor.setStyleForSelectedShapes(style, value)
			editor.setStyleForNextShapes(style, value)
			if (style.id === DefaultSizeStyle.id && editor.getSelectedShapeIds().length > 0) {
				kickoutOccludedShapes(editor, editor.getSelectedShapeIds())
			}
		})
		trackEvent('set-style', { source: 'command-palette', id: style.id, value: value as string })
	}

	// Custom theme colors, fonts and geo types have no translation, so they show their value.
	const valueLabel = (uiType: string, value: string) => {
		const key = `${uiType}-style.${value}` as TLUiTranslationKey
		const label = msg(key)
		return label === key ? value : label
	}

	const picker = <T extends string>(
		id: string,
		label: string,
		style: StyleProp<T>,
		uiType: string,
		values: readonly T[]
	) => {
		const current = styles.get(style)
		if (current === undefined) return null
		return (
			<TldrawUiMenuSubmenu id={`style-${id}`} label={label}>
				{values.map((value) => (
					<TldrawUiMenuCheckboxItem
						key={value}
						id={`style-${id}-${value}`}
						label={valueLabel(uiType, value)}
						checked={current.type === 'shared' && current.value === value}
						onSelect={() => setStyle(style, value)}
					/>
				))}
			</TldrawUiMenuSubmenu>
		)
	}

	const values = <T extends string>(items: readonly { value: T }[]) => items.map((i) => i.value)

	return (
		<TldrawUiMenuGroup id="command-palette-styles" label="style-panel.title">
			{picker('color', msg('style-panel.color'), DefaultColorStyle, 'color', values(colors))}
			{opacity !== undefined && (
				<TldrawUiMenuSubmenu id="style-opacity" label={msg('style-panel.opacity')}>
					{OPACITIES.map((value) => (
						<TldrawUiMenuCheckboxItem
							key={value}
							id={`style-opacity-${value}`}
							label={msg(`opacity-style.${value}`)}
							checked={opacity.type === 'shared' && opacity.value === value}
							onSelect={() => {
								editor.run(() => {
									editor.markHistoryStoppingPoint('set opacity')
									if (editor.isIn('select')) editor.setOpacityForSelectedShapes(value)
									editor.setOpacityForNextShapes(value)
								})
								trackEvent('set-style', { source: 'command-palette', id: 'opacity', value })
							}}
						/>
					))}
				</TldrawUiMenuSubmenu>
			)}
			{picker(
				'fill',
				msg('style-panel.fill'),
				DefaultFillStyle,
				'fill',
				values([...STYLES.fill, ...STYLES.fillExtra])
			)}
			{picker('dash', msg('style-panel.dash'), DefaultDashStyle, 'dash', values(STYLES.dash))}
			{picker('size', msg('style-panel.size'), DefaultSizeStyle, 'size', values(STYLES.size))}
			{picker('font', msg('style-panel.font'), DefaultFontStyle, 'font', values(fonts))}
			{picker(
				'align',
				msg('style-panel.align'),
				DefaultTextAlignStyle,
				'align',
				values(STYLES.textAlign)
			)}
			{picker(
				'label-align',
				msg('style-panel.label-align'),
				DefaultHorizontalAlignStyle,
				'align',
				values(STYLES.horizontalAlign)
			)}
			{picker(
				'vertical-align',
				msg('style-panel.vertical-align'),
				DefaultVerticalAlignStyle,
				'verticalAlign',
				values(STYLES.verticalAlign)
			)}
			{picker('geo', msg('style-panel.geo'), GeoShapeGeoStyle, 'geo', geoTypes)}
			{picker(
				'arrow-kind',
				msg('style-panel.arrow-kind'),
				ArrowShapeKindStyle,
				'arrow-kind',
				values(STYLES.arrowKind)
			)}
			{picker(
				'arrowhead-start',
				msg('command-palette.arrowhead-start'),
				ArrowShapeArrowheadStartStyle,
				'arrowheadStart',
				values(STYLES.arrowheadStart)
			)}
			{picker(
				'arrowhead-end',
				msg('command-palette.arrowhead-end'),
				ArrowShapeArrowheadEndStyle,
				'arrowheadEnd',
				values(STYLES.arrowheadEnd)
			)}
			{picker(
				'spline',
				msg('style-panel.spline'),
				LineShapeSplineStyle,
				'spline',
				values(STYLES.spline)
			)}
		</TldrawUiMenuGroup>
	)
}
