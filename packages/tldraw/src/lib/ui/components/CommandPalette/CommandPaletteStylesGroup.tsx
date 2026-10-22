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
	defineMessages,
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
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { styleMessageId, stylePanelMessages } from '../../styleMessages'
import { TldrawUiMenuCheckboxItem } from '../primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from '../primitives/menus/TldrawUiMenuSubmenu'

const OPACITIES = [0.1, 0.25, 0.5, 0.75, 1] as const

const messages = defineMessages({
	arrowheadStart: { id: 'command-palette.arrowhead-start', defaultMessage: 'Start arrowhead' },
	arrowheadEnd: { id: 'command-palette.arrowhead-end', defaultMessage: 'End arrowhead' },
})

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
		const key = styleMessageId(uiType, value)
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
		<TldrawUiMenuGroup id="command-palette-styles" label={stylePanelMessages.title.id}>
			{picker('color', msg(stylePanelMessages.color), DefaultColorStyle, 'color', values(colors))}
			{opacity !== undefined && (
				<TldrawUiMenuSubmenu id="style-opacity" label={msg(stylePanelMessages.opacity)}>
					{OPACITIES.map((value) => (
						<TldrawUiMenuCheckboxItem
							key={value}
							id={`style-opacity-${value}`}
							label={msg(styleMessageId('opacity', value))}
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
				msg(stylePanelMessages.fill),
				DefaultFillStyle,
				'fill',
				values([...STYLES.fill, ...STYLES.fillExtra])
			)}
			{picker('dash', msg(stylePanelMessages.dash), DefaultDashStyle, 'dash', values(STYLES.dash))}
			{picker('size', msg(stylePanelMessages.size), DefaultSizeStyle, 'size', values(STYLES.size))}
			{picker('font', msg(stylePanelMessages.font), DefaultFontStyle, 'font', values(fonts))}
			{picker(
				'align',
				msg(stylePanelMessages.align),
				DefaultTextAlignStyle,
				'align',
				values(STYLES.textAlign)
			)}
			{picker(
				'label-align',
				msg(stylePanelMessages['label-align']),
				DefaultHorizontalAlignStyle,
				'align',
				values(STYLES.horizontalAlign)
			)}
			{picker(
				'vertical-align',
				msg(stylePanelMessages['vertical-align']),
				DefaultVerticalAlignStyle,
				'verticalAlign',
				values(STYLES.verticalAlign)
			)}
			{picker('geo', msg(stylePanelMessages.geo), GeoShapeGeoStyle, 'geo', geoTypes)}
			{picker(
				'arrow-kind',
				msg(stylePanelMessages['arrow-kind']),
				ArrowShapeKindStyle,
				'arrow-kind',
				values(STYLES.arrowKind)
			)}
			{picker(
				'arrowhead-start',
				msg(messages.arrowheadStart),
				ArrowShapeArrowheadStartStyle,
				'arrowheadStart',
				values(STYLES.arrowheadStart)
			)}
			{picker(
				'arrowhead-end',
				msg(messages.arrowheadEnd),
				ArrowShapeArrowheadEndStyle,
				'arrowheadEnd',
				values(STYLES.arrowheadEnd)
			)}
			{picker(
				'spline',
				msg(stylePanelMessages.spline),
				LineShapeSplineStyle,
				'spline',
				values(STYLES.spline)
			)}
		</TldrawUiMenuGroup>
	)
}
