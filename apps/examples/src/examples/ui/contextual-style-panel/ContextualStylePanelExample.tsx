import { useState } from 'react'
import {
	ArrowShapeArrowheadEndStyle,
	ArrowShapeArrowheadStartStyle,
	ArrowShapeKindStyle,
	Box,
	defaultGeoTypeDefinitions,
	DefaultColorStyle,
	DefaultDashStyle,
	DefaultFillStyle,
	DefaultFontStyle,
	DefaultHorizontalAlignStyle,
	DefaultSizeStyle,
	DefaultTextAlignStyle,
	DefaultVerticalAlignStyle,
	Editor,
	GeoShapeGeoStyle,
	GeoShapeUtil,
	getColorStyleItems,
	getColorValue,
	getFontStyleItems,
	LineShapeSplineStyle,
	SharedStyle,
	StyleProp,
	StyleValuesForUi,
	tlmenus,
	TLComponents,
	TLDefaultColorStyle,
	Tldraw,
	TldrawUiButtonIcon,
	TldrawUiContextualToolbar,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	TldrawUiToolbar,
	TldrawUiToolbarButton,
	TLUiIconType,
	track,
	useEditor,
	useTranslation,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const FILL_ITEMS = [
	{ value: 'none', icon: 'fill-none' },
	{ value: 'semi', icon: 'fill-semi' },
	{ value: 'solid', icon: 'fill-solid' },
	{ value: 'pattern', icon: 'fill-pattern' },
	{ value: 'lined-fill', icon: 'fill-lined-fill' },
	{ value: 'fill', icon: 'fill-fill' },
] as const

const DASH_ITEMS = [
	{ value: 'draw', icon: 'dash-draw' },
	{ value: 'dashed', icon: 'dash-dashed' },
	{ value: 'dotted', icon: 'dash-dotted' },
	{ value: 'solid', icon: 'dash-solid' },
] as const

const SIZE_ITEMS = [
	{ value: 's', icon: 'size-small' },
	{ value: 'm', icon: 'size-medium' },
	{ value: 'l', icon: 'size-large' },
	{ value: 'xl', icon: 'size-extra-large' },
] as const

const ARROW_KIND_ITEMS = [
	{ value: 'arc', icon: 'arrow-arc' },
	{ value: 'elbow', icon: 'arrow-elbow' },
] as const

const ARROWHEAD_ITEMS = [
	{ value: 'none', icon: 'arrowhead-none' },
	{ value: 'arrow', icon: 'arrowhead-arrow' },
	{ value: 'triangle', icon: 'arrowhead-triangle' },
	{ value: 'square', icon: 'arrowhead-square' },
	{ value: 'dot', icon: 'arrowhead-dot' },
	{ value: 'diamond', icon: 'arrowhead-diamond' },
	{ value: 'inverted', icon: 'arrowhead-triangle-inverted' },
	{ value: 'bar', icon: 'arrowhead-bar' },
] as const

const SPLINE_ITEMS = [
	{ value: 'line', icon: 'spline-line' },
	{ value: 'cubic', icon: 'spline-cubic' },
] as const

const TEXT_ALIGN_ITEMS = [
	{ value: 'start', icon: 'text-align-left' },
	{ value: 'middle', icon: 'text-align-center' },
	{ value: 'end', icon: 'text-align-right' },
] as const

const LABEL_ALIGN_ITEMS = [
	{ value: 'start', icon: 'horizontal-align-start' },
	{ value: 'middle', icon: 'horizontal-align-middle' },
	{ value: 'end', icon: 'horizontal-align-end' },
] as const

const VERTICAL_ALIGN_ITEMS = [
	{ value: 'start', icon: 'vertical-align-start' },
	{ value: 'middle', icon: 'vertical-align-middle' },
	{ value: 'end', icon: 'vertical-align-end' },
] as const

// [2]
function getGeoStyleItems(editor: Editor): StyleValuesForUi<string> {
	const { customGeoTypes } = editor.getShapeUtil<GeoShapeUtil>('geo').options
	const merged = { ...defaultGeoTypeDefinitions, ...customGeoTypes }
	return Object.entries(merged).map(([value, definition]) => ({ value, icon: definition.icon }))
}

interface StylePickerProps<T extends string> {
	uiType: string
	style: StyleProp<T>
	value: SharedStyle<T>
	items: StyleValuesForUi<T>
	/** Defaults to `style-panel.<uiType>`. Pass this when the two don't line up. */
	labelKey?: string
	getItemColor?(value: T): string
}

// [3]
function StylePicker<T extends string>({
	uiType,
	style,
	value,
	items,
	labelKey,
	getItemColor,
}: StylePickerProps<T>) {
	const editor = useEditor()
	const msg = useTranslation()
	const [isOpen, setIsOpen] = useState(false)

	// [4]
	const popoverId = `contextual style ${style.id}`
	const label = msg(labelKey ?? `style-panel.${uiType}`)
	const icon =
		value.type === 'mixed'
			? 'mixed'
			: (items.find((item) => item.value === value.value)?.icon ?? items[0]?.icon)

	// [5]
	const handleSelect = (next: T) => {
		editor.markHistoryStoppingPoint('contextual style panel')
		editor.run(() => {
			editor.setStyleForSelectedShapes(style, next)
			editor.setStyleForNextShapes(style, next)
		})
		// [6]
		tlmenus.deleteOpenMenu(popoverId, editor.contextId)
		setIsOpen(false)
	}

	return (
		<TldrawUiPopover id={popoverId} open={isOpen} onOpenChange={setIsOpen}>
			<TldrawUiPopoverTrigger>
				<TldrawUiToolbarButton
					type="icon"
					title={label}
					style={value.type === 'shared' ? { color: getItemColor?.(value.value) } : undefined}
				>
					<TldrawUiButtonIcon icon={icon as TLUiIconType} />
				</TldrawUiToolbarButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent side="bottom" align="center" sideOffset={8}>
				<TldrawUiToolbar
					className="tlui-menu"
					orientation={items.length > 4 ? 'grid' : 'horizontal'}
					label={label}
				>
					{items.map((item) => (
						<TldrawUiToolbarButton
							key={item.value}
							type="icon"
							title={msg(`${uiType}-style.${item.value}`)}
							isActive={value.type === 'shared' && value.value === item.value}
							style={{ color: getItemColor?.(item.value) }}
							onClick={() => handleSelect(item.value)}
						>
							<TldrawUiButtonIcon icon={item.icon as TLUiIconType} />
						</TldrawUiToolbarButton>
					))}
				</TldrawUiToolbar>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}

// [7]
const ContextualStylePanel = track(() => {
	const editor = useEditor()
	const msg = useTranslation()

	// [8]
	const styles = editor.getSharedStyles()
	if (!editor.isIn('select.idle') || editor.getSelectedShapeIds().length === 0) return null

	const color = styles.get(DefaultColorStyle)
	const fill = styles.get(DefaultFillStyle)
	const dash = styles.get(DefaultDashStyle)
	const size = styles.get(DefaultSizeStyle)
	const font = styles.get(DefaultFontStyle)
	const geo = styles.get(GeoShapeGeoStyle)
	const arrowKind = styles.get(ArrowShapeKindStyle)
	const arrowheadStart = styles.get(ArrowShapeArrowheadStartStyle)
	const arrowheadEnd = styles.get(ArrowShapeArrowheadEndStyle)
	const spline = styles.get(LineShapeSplineStyle)
	const textAlign = styles.get(DefaultTextAlignStyle)
	const labelAlign = styles.get(DefaultHorizontalAlignStyle)
	const verticalAlign = styles.get(DefaultVerticalAlignStyle)

	const theme = editor.getCurrentTheme()
	const colors = theme.colors[editor.getColorMode()]

	// [9]
	const getSelectionBounds = () => {
		const bounds = editor.getSelectionRotatedScreenBounds()
		if (!bounds) return undefined
		return new Box(bounds.x, bounds.y, bounds.width, 0)
	}

	return (
		<TldrawUiContextualToolbar
			getSelectionBounds={getSelectionBounds}
			label={msg('style-panel.title')}
		>
			{color && (
				<StylePicker
					uiType="color"
					style={DefaultColorStyle}
					value={color}
					items={getColorStyleItems(colors)}
					getItemColor={(value) => getColorValue(colors, value as TLDefaultColorStyle, 'solid')}
				/>
			)}
			{fill && (
				<StylePicker uiType="fill" style={DefaultFillStyle} value={fill} items={FILL_ITEMS} />
			)}
			{dash && (
				<StylePicker uiType="dash" style={DefaultDashStyle} value={dash} items={DASH_ITEMS} />
			)}
			{size && (
				<StylePicker uiType="size" style={DefaultSizeStyle} value={size} items={SIZE_ITEMS} />
			)}
			{font && (
				<StylePicker
					uiType="font"
					style={DefaultFontStyle}
					value={font}
					items={getFontStyleItems(theme)}
				/>
			)}
			{geo && (
				<StylePicker
					uiType="geo"
					style={GeoShapeGeoStyle}
					value={geo}
					items={getGeoStyleItems(editor)}
				/>
			)}
			{arrowKind && (
				<StylePicker
					uiType="arrow-kind"
					style={ArrowShapeKindStyle}
					value={arrowKind}
					items={ARROW_KIND_ITEMS}
				/>
			)}
			{arrowheadStart && (
				<StylePicker
					uiType="arrowheadStart"
					labelKey="style-panel.arrowhead-start"
					style={ArrowShapeArrowheadStartStyle}
					value={arrowheadStart}
					items={ARROWHEAD_ITEMS}
				/>
			)}
			{arrowheadEnd && (
				<StylePicker
					uiType="arrowheadEnd"
					labelKey="style-panel.arrowhead-end"
					style={ArrowShapeArrowheadEndStyle}
					value={arrowheadEnd}
					items={ARROWHEAD_ITEMS}
				/>
			)}
			{spline && (
				<StylePicker
					uiType="spline"
					style={LineShapeSplineStyle}
					value={spline}
					items={SPLINE_ITEMS}
				/>
			)}
			{textAlign && (
				<StylePicker
					uiType="align"
					style={DefaultTextAlignStyle}
					value={textAlign}
					items={TEXT_ALIGN_ITEMS}
				/>
			)}
			{labelAlign && (
				<StylePicker
					uiType="align"
					labelKey="style-panel.label-align"
					style={DefaultHorizontalAlignStyle}
					value={labelAlign}
					items={LABEL_ALIGN_ITEMS}
				/>
			)}
			{verticalAlign && (
				<StylePicker
					uiType="verticalAlign"
					labelKey="style-panel.vertical-align"
					style={DefaultVerticalAlignStyle}
					value={verticalAlign}
					items={VERTICAL_ALIGN_ITEMS}
				/>
			)}
		</TldrawUiContextualToolbar>
	)
})

// [10]
const components: TLComponents = {
	StylePanel: null,
	InFrontOfTheCanvas: ContextualStylePanel,
}

export default function ContextualStylePanelExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
The style panel is a component slot like any other. Switch off the built-in one and you can
build your own style controls and put them wherever your app needs them.

This example moves them onto the canvas, into a toolbar that floats above the selected shapes.
It shows only the styles that selection supports, so it's short for a highlighter and long for
an arrow.

[1]
Each picker needs a list of the style values it offers and an icon for each one. The SDK keeps
its own lists private, so we spell ours out here.

These match what the docked panel offers, which is narrower than what the schema allows. There's
no icon for the `pipe` arrowhead or for `dash: none`, and the `*-legacy` label alignments only
turn up in migrated documents, so none of them are worth a button. See [4] for what the trigger
shows when a shape holds one of these values anyway.

[2]
Three of the lists are built at render time instead. `getColorStyleItems` and `getFontStyleItems`
read the current theme, and `getGeoStyleItems` merges the built-in geo types with any registered
through `GeoShapeUtil.configure()`. Custom colors, fonts and geo types need no extra work here.

[3]
One component covers every style. The trigger shows the current value and opens a popover below
the toolbar, which keeps the rest of the controls visible while you pick.

`uiType` is the name the SDK uses for a style in its translation files, so it gives us the
button labels for free: "Color" and "Light blue" rather than `color` and `light-blue`. Four
styles name their panel section differently from their values, and `labelKey` covers those.

Only color passes `getItemColor`. Icons are drawn in `currentColor`, so setting `color` on a
button turns it into a swatch.

[4]
Two details on the trigger. The popover id comes from `style.id` rather than `uiType`, because
text align and label align share a `uiType` and would otherwise fight over one id. And when the
current value has no button of its own, we fall back to the first item's icon so the trigger
never renders blank. The docked panel's dropdowns do the same.

[5]
`setStyleForSelectedShapes` restyles the current selection and `setStyleForNextShapes` carries
the value to the next shape you draw. The docked panel sets both too. Marking a stopping point
first means one undo reverts the whole change.

[6]
A popover registers itself with the editor's menu system, and `MenuClickCapture` responds by
covering the canvas with a layer that swallows the next click. Our toolbar sits on the canvas,
underneath that layer, so it goes dead while a menu is open. Closing the popover as soon as a
value is picked keeps the toolbar clickable.

[7]
`track` re-renders this component whenever the reactive editor state it reads changes. That's
what makes the toolbar follow the selection.

[8]
A shape supports a style when its props schema declares it as a `StyleProp`, so the editor works
out which controls apply without us naming a single shape type. `editor.getSharedStyles()`
returns the styles that every selected shape supports, and we render a picker only when its
style is there.

Select a line and you get color, dash, size and spline. Select a text shape and you get color,
size, font and alignment. Select the two together and only color and size survive. Custom shapes
need no special handling: declare `color: DefaultColorStyle` in the props and the color picker
appears.

The reverse holds too. A frame declares `color` as a plain validator rather than a `StyleProp`,
which is how it stays out of the style panel, so selecting one here gives you no toolbar at all.

A style's value is `shared` when all the selected shapes agree on it and `mixed` when they
don't. The pickers use this to decide which item to highlight.

[9]
`getSelectionBounds` tells the toolbar where to position itself. We collapse the bounds to zero
height so the toolbar sits just above the top edge of the selection.

[10]
Setting `StylePanel` to null removes the docked panel on both desktop and mobile.
`InFrontOfTheCanvas` renders our toolbar on top of the shapes but behind the rest of the UI.
*/
