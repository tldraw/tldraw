import {
	ArrowShapeArrowheadEndStyle,
	ArrowShapeArrowheadStartStyle,
	ArrowShapeKindStyle,
	compact,
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
	SharedStyle,
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

interface StylePicker<T extends string | number = string | number> {
	id: string
	label: string
	values: readonly T[]
	current: SharedStyle<T>
	labelFor(value: T): string
	onSelect(value: T): void
}

/**
 * The style panel's styles, one submenu each, for the selection or, with nothing selected, the next
 * shape. Lists only the styles the style panel would show. Needs an editor.
 *
 * @public @react
 */
export function CommandPaletteStylesGroup() {
	const isReadonly = useReadonly()
	const pickers = useCommandPaletteStylePickers()
	if (isReadonly || !pickers) return null
	return (
		<TldrawUiMenuGroup id="command-palette-styles" label={stylePanelMessages.title.id}>
			{pickers.map((picker) => (
				<CommandPaletteStylePicker key={picker.id} picker={picker} />
			))}
		</TldrawUiMenuGroup>
	)
}

function CommandPaletteStylePicker({ picker }: { picker: StylePicker }) {
	const { id, label, values, current } = picker
	return (
		<TldrawUiMenuSubmenu id={`style-${id}`} label={label}>
			{values.map((value) => (
				<TldrawUiMenuCheckboxItem
					key={value}
					id={`style-${id}-${value}`}
					label={picker.labelFor(value)}
					checked={current.type === 'shared' && current.value === value}
					onSelect={() => picker.onSelect(value)}
				/>
			))}
		</TldrawUiMenuSubmenu>
	)
}

/** The pickers for the styles that apply, in style panel order; null when no styles apply. */
function useCommandPaletteStylePickers(): StylePicker[] | null {
	const editor = useEditor()
	const msg = useTranslation()
	const trackEvent = useUiEvents()
	const styles = useRelevantStyles()
	const opacity = useValue('opacity', () => editor.getSharedOpacity(), [editor])
	const colors = useValue(
		'color items',
		() => getColorStyleItems(editor.getCurrentTheme().colors[editor.getColorMode()]),
		[editor]
	)
	const fonts = useValue('font items', () => getFontStyleItems(editor.getCurrentTheme()), [editor])
	if (!styles) return null

	// The geo util is absent from editors without geo shapes, where getShapeUtil throws.
	const geoTypes =
		styles.get(GeoShapeGeoStyle) === undefined || !editor.hasShapeUtil('geo')
			? []
			: Object.keys({
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

	const stylePicker = <T extends string>({
		id,
		label,
		style,
		uiType,
		values,
	}: {
		id: string
		label: string
		style: StyleProp<T>
		uiType: string
		values: readonly T[]
	}): StylePicker<T> | null => {
		const current = styles.get(style)
		if (current === undefined) return null
		return {
			id,
			label,
			values,
			current,
			labelFor: (value) => valueLabel(uiType, value),
			onSelect: (value) => setStyle(style, value),
		}
	}

	const valuesOf = <T extends string>(items: readonly { value: T }[]) => items.map((i) => i.value)

	const opacityPicker: StylePicker<number> = {
		id: 'opacity',
		label: msg(stylePanelMessages.opacity),
		values: OPACITIES,
		current: opacity,
		labelFor: (value) => msg(styleMessageId('opacity', value)),
		onSelect: (value) => {
			editor.run(() => {
				editor.markHistoryStoppingPoint('set opacity')
				if (editor.isIn('select')) editor.setOpacityForSelectedShapes(value)
				editor.setOpacityForNextShapes(value)
			})
			trackEvent('set-style', { source: 'command-palette', id: 'opacity', value })
		},
	}

	return compact<StylePicker | null>([
		stylePicker({
			id: 'color',
			label: msg(stylePanelMessages.color),
			style: DefaultColorStyle,
			uiType: 'color',
			values: valuesOf(colors),
		}),
		opacityPicker,
		stylePicker({
			id: 'fill',
			label: msg(stylePanelMessages.fill),
			style: DefaultFillStyle,
			uiType: 'fill',
			values: valuesOf([...STYLES.fill, ...STYLES.fillExtra]),
		}),
		stylePicker({
			id: 'dash',
			label: msg(stylePanelMessages.dash),
			style: DefaultDashStyle,
			uiType: 'dash',
			values: valuesOf(STYLES.dash),
		}),
		stylePicker({
			id: 'size',
			label: msg(stylePanelMessages.size),
			style: DefaultSizeStyle,
			uiType: 'size',
			values: valuesOf(STYLES.size),
		}),
		stylePicker({
			id: 'font',
			label: msg(stylePanelMessages.font),
			style: DefaultFontStyle,
			uiType: 'font',
			values: valuesOf(fonts),
		}),
		stylePicker({
			id: 'align',
			label: msg(stylePanelMessages.align),
			style: DefaultTextAlignStyle,
			uiType: 'align',
			values: valuesOf(STYLES.textAlign),
		}),
		stylePicker({
			id: 'label-align',
			label: msg(stylePanelMessages['label-align']),
			style: DefaultHorizontalAlignStyle,
			uiType: 'align',
			values: valuesOf(STYLES.horizontalAlign),
		}),
		stylePicker({
			id: 'vertical-align',
			label: msg(stylePanelMessages['vertical-align']),
			style: DefaultVerticalAlignStyle,
			uiType: 'verticalAlign',
			values: valuesOf(STYLES.verticalAlign),
		}),
		stylePicker({
			id: 'geo',
			label: msg(stylePanelMessages.geo),
			style: GeoShapeGeoStyle,
			uiType: 'geo',
			values: geoTypes,
		}),
		stylePicker({
			id: 'arrow-kind',
			label: msg(stylePanelMessages['arrow-kind']),
			style: ArrowShapeKindStyle,
			uiType: 'arrow-kind',
			values: valuesOf(STYLES.arrowKind),
		}),
		stylePicker({
			id: 'arrowhead-start',
			label: msg(messages.arrowheadStart),
			style: ArrowShapeArrowheadStartStyle,
			uiType: 'arrowheadStart',
			values: valuesOf(STYLES.arrowheadStart),
		}),
		stylePicker({
			id: 'arrowhead-end',
			label: msg(messages.arrowheadEnd),
			style: ArrowShapeArrowheadEndStyle,
			uiType: 'arrowheadEnd',
			values: valuesOf(STYLES.arrowheadEnd),
		}),
		stylePicker({
			id: 'spline',
			label: msg(stylePanelMessages.spline),
			style: LineShapeSplineStyle,
			uiType: 'spline',
			values: valuesOf(STYLES.spline),
		}),
	])
}
