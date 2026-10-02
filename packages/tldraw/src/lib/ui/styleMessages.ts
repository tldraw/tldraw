import { defineMessages } from '@tldraw/editor'

/**
 * Labels for every value of every style the SDK ships, keyed by the id itself.
 *
 * The style pickers build their key from two interpolations —
 * `` msg(`${uiType}-style.${item.value}`) `` — so the extractor can't see a single one of these
 * ids at the call site. Declaring them here is what puts them in the catalog; the pickers go on
 * composing the key, and `styleMessages.test.ts` holds the two in sync by checking every value of
 * every style prop against this map.
 *
 * `uiType` is an open prop, so a custom style's values won't be here and will fall back to
 * rendering their key. Supply those through an app's own translations.
 *
 * @internal
 */
export const styleMessages = defineMessages({
	'align-style.end': { id: 'align-style.end', defaultMessage: 'End' },
	'align-style.justify': { id: 'align-style.justify', defaultMessage: 'Justify' },
	'align-style.middle': { id: 'align-style.middle', defaultMessage: 'Middle' },
	'align-style.start': { id: 'align-style.start', defaultMessage: 'Start' },

	'arrow-kind-style.arc': { id: 'arrow-kind-style.arc', defaultMessage: 'Arc' },
	'arrow-kind-style.elbow': { id: 'arrow-kind-style.elbow', defaultMessage: 'Elbow' },

	'arrowheadEnd-style.arrow': { id: 'arrowheadEnd-style.arrow', defaultMessage: 'Arrow' },
	'arrowheadEnd-style.bar': { id: 'arrowheadEnd-style.bar', defaultMessage: 'Bar' },
	'arrowheadEnd-style.diamond': { id: 'arrowheadEnd-style.diamond', defaultMessage: 'Diamond' },
	'arrowheadEnd-style.dot': { id: 'arrowheadEnd-style.dot', defaultMessage: 'Dot' },
	'arrowheadEnd-style.inverted': { id: 'arrowheadEnd-style.inverted', defaultMessage: 'Inverted' },
	'arrowheadEnd-style.none': { id: 'arrowheadEnd-style.none', defaultMessage: 'None' },
	'arrowheadEnd-style.pipe': { id: 'arrowheadEnd-style.pipe', defaultMessage: 'Pipe' },
	'arrowheadEnd-style.square': { id: 'arrowheadEnd-style.square', defaultMessage: 'Square' },
	'arrowheadEnd-style.triangle': { id: 'arrowheadEnd-style.triangle', defaultMessage: 'Triangle' },

	'arrowheadStart-style.arrow': { id: 'arrowheadStart-style.arrow', defaultMessage: 'Arrow' },
	'arrowheadStart-style.bar': { id: 'arrowheadStart-style.bar', defaultMessage: 'Bar' },
	'arrowheadStart-style.diamond': { id: 'arrowheadStart-style.diamond', defaultMessage: 'Diamond' },
	'arrowheadStart-style.dot': { id: 'arrowheadStart-style.dot', defaultMessage: 'Dot' },
	'arrowheadStart-style.inverted': {
		id: 'arrowheadStart-style.inverted',
		defaultMessage: 'Inverted',
	},
	'arrowheadStart-style.none': { id: 'arrowheadStart-style.none', defaultMessage: 'None' },
	'arrowheadStart-style.pipe': { id: 'arrowheadStart-style.pipe', defaultMessage: 'Pipe' },
	'arrowheadStart-style.square': { id: 'arrowheadStart-style.square', defaultMessage: 'Square' },
	'arrowheadStart-style.triangle': {
		id: 'arrowheadStart-style.triangle',
		defaultMessage: 'Triangle',
	},

	'color-style.black': { id: 'color-style.black', defaultMessage: 'Black' },
	'color-style.blue': { id: 'color-style.blue', defaultMessage: 'Blue' },
	'color-style.green': { id: 'color-style.green', defaultMessage: 'Green' },
	'color-style.grey': { id: 'color-style.grey', defaultMessage: 'Grey' },
	'color-style.light-blue': { id: 'color-style.light-blue', defaultMessage: 'Light blue' },
	'color-style.light-green': { id: 'color-style.light-green', defaultMessage: 'Light green' },
	'color-style.light-red': { id: 'color-style.light-red', defaultMessage: 'Light red' },
	'color-style.light-violet': { id: 'color-style.light-violet', defaultMessage: 'Light violet' },
	'color-style.orange': { id: 'color-style.orange', defaultMessage: 'Orange' },
	'color-style.red': { id: 'color-style.red', defaultMessage: 'Red' },
	'color-style.violet': { id: 'color-style.violet', defaultMessage: 'Violet' },
	'color-style.white': { id: 'color-style.white', defaultMessage: 'White' },
	'color-style.yellow': { id: 'color-style.yellow', defaultMessage: 'Yellow' },

	'dash-style.dashed': { id: 'dash-style.dashed', defaultMessage: 'Dashed' },
	'dash-style.dotted': { id: 'dash-style.dotted', defaultMessage: 'Dotted' },
	'dash-style.draw': { id: 'dash-style.draw', defaultMessage: 'Draw' },
	'dash-style.solid': { id: 'dash-style.solid', defaultMessage: 'Solid' },

	'fill-style.fill': { id: 'fill-style.fill', defaultMessage: 'Fill' },
	'fill-style.lined-fill': { id: 'fill-style.lined-fill', defaultMessage: 'Lined fill' },
	'fill-style.none': { id: 'fill-style.none', defaultMessage: 'None' },
	'fill-style.pattern': { id: 'fill-style.pattern', defaultMessage: 'Pattern' },
	'fill-style.semi': { id: 'fill-style.semi', defaultMessage: 'Semi' },
	'fill-style.solid': { id: 'fill-style.solid', defaultMessage: 'Solid' },

	'font-style.draw': { id: 'font-style.draw', defaultMessage: 'Draw' },
	'font-style.mono': { id: 'font-style.mono', defaultMessage: 'Mono' },
	'font-style.sans': { id: 'font-style.sans', defaultMessage: 'Sans' },
	'font-style.serif': { id: 'font-style.serif', defaultMessage: 'Serif' },

	'geo-style.arrow-down': { id: 'geo-style.arrow-down', defaultMessage: 'Arrow down' },
	'geo-style.arrow-left': { id: 'geo-style.arrow-left', defaultMessage: 'Arrow left' },
	'geo-style.arrow-right': { id: 'geo-style.arrow-right', defaultMessage: 'Arrow right' },
	'geo-style.arrow-up': { id: 'geo-style.arrow-up', defaultMessage: 'Arrow up' },
	'geo-style.check-box': { id: 'geo-style.check-box', defaultMessage: 'Check box' },
	'geo-style.cloud': { id: 'geo-style.cloud', defaultMessage: 'Cloud' },
	'geo-style.diamond': { id: 'geo-style.diamond', defaultMessage: 'Diamond' },
	'geo-style.ellipse': { id: 'geo-style.ellipse', defaultMessage: 'Ellipse' },
	'geo-style.heart': { id: 'geo-style.heart', defaultMessage: 'Heart' },
	'geo-style.hexagon': { id: 'geo-style.hexagon', defaultMessage: 'Hexagon' },
	'geo-style.octagon': { id: 'geo-style.octagon', defaultMessage: 'Octagon' },
	'geo-style.oval': { id: 'geo-style.oval', defaultMessage: 'Oval' },
	'geo-style.pentagon': { id: 'geo-style.pentagon', defaultMessage: 'Pentagon' },
	'geo-style.rectangle': { id: 'geo-style.rectangle', defaultMessage: 'Rectangle' },
	'geo-style.rhombus': { id: 'geo-style.rhombus', defaultMessage: 'Rhombus' },
	'geo-style.rhombus-2': { id: 'geo-style.rhombus-2', defaultMessage: 'Rhombus left' },
	'geo-style.star': { id: 'geo-style.star', defaultMessage: 'Star' },
	'geo-style.trapezoid': { id: 'geo-style.trapezoid', defaultMessage: 'Trapezoid' },
	'geo-style.triangle': { id: 'geo-style.triangle', defaultMessage: 'Triangle' },
	'geo-style.x-box': { id: 'geo-style.x-box', defaultMessage: 'X box' },

	'opacity-style.0.1': { id: 'opacity-style.0.1', defaultMessage: '10%' },
	'opacity-style.0.25': { id: 'opacity-style.0.25', defaultMessage: '25%' },
	'opacity-style.0.5': { id: 'opacity-style.0.5', defaultMessage: '50%' },
	'opacity-style.0.75': { id: 'opacity-style.0.75', defaultMessage: '75%' },
	'opacity-style.1': { id: 'opacity-style.1', defaultMessage: '100%' },

	'size-style.l': { id: 'size-style.l', defaultMessage: 'Large' },
	'size-style.m': { id: 'size-style.m', defaultMessage: 'Medium' },
	'size-style.s': { id: 'size-style.s', defaultMessage: 'Small' },
	'size-style.xl': { id: 'size-style.xl', defaultMessage: 'Extra large' },

	'spline-style.cubic': { id: 'spline-style.cubic', defaultMessage: 'Cubic' },
	'spline-style.line': { id: 'spline-style.line', defaultMessage: 'Line' },

	'verticalAlign-style.end': { id: 'verticalAlign-style.end', defaultMessage: 'Bottom' },
	'verticalAlign-style.middle': { id: 'verticalAlign-style.middle', defaultMessage: 'Middle' },
	'verticalAlign-style.start': { id: 'verticalAlign-style.start', defaultMessage: 'Top' },
})

/**
 * The style panel's own labels — section headings and the two words the pickers add around a
 * value. `StylePanelDropdownPicker` composes `` msg(`style-panel.${stylePanelType}`) ``, so these
 * ids are invisible at the call site too. `stylePanelType` is an open prop, so a custom section's
 * heading falls back to rendering its key.
 *
 * @internal
 */
export const stylePanelMessages = defineMessages({
	align: { id: 'style-panel.align', defaultMessage: 'Align' },
	'arrow-kind': { id: 'style-panel.arrow-kind', defaultMessage: 'Line' },
	'arrowhead-end': { id: 'style-panel.arrowhead-end', defaultMessage: 'End' },
	'arrowhead-start': { id: 'style-panel.arrowhead-start', defaultMessage: 'Start' },
	arrowheads: { id: 'style-panel.arrowheads', defaultMessage: 'Arrows' },
	color: { id: 'style-panel.color', defaultMessage: 'Color' },
	dash: { id: 'style-panel.dash', defaultMessage: 'Dash' },
	fill: { id: 'style-panel.fill', defaultMessage: 'Fill' },
	font: { id: 'style-panel.font', defaultMessage: 'Font' },
	geo: { id: 'style-panel.geo', defaultMessage: 'Shape' },
	'label-align': { id: 'style-panel.label-align', defaultMessage: 'Label align' },
	mixed: { id: 'style-panel.mixed', defaultMessage: 'Mixed' },
	opacity: { id: 'style-panel.opacity', defaultMessage: 'Opacity' },
	position: { id: 'style-panel.position', defaultMessage: 'Position' },
	selected: { id: 'style-panel.selected', defaultMessage: 'selected' },
	size: { id: 'style-panel.size', defaultMessage: 'Size' },
	spline: { id: 'style-panel.spline', defaultMessage: 'Spline' },
	title: { id: 'style-panel.title', defaultMessage: 'Styles' },
	'vertical-align': { id: 'style-panel.vertical-align', defaultMessage: 'Vertical align' },
})

/**
 * The id to translate for a style value's label.
 *
 * Resolves through {@link styleMessages} so the map is load-bearing rather than a list that can
 * quietly fall out of step: drop an entry and the picker stops finding it. Falls back to the
 * composed key for a custom style, whose values the SDK can't know.
 *
 * @internal
 */
export function styleMessageId(uiType: string, value: string | number): string {
	const id = `${uiType}-style.${value}`
	return styleMessages[id as keyof typeof styleMessages]?.id ?? id
}

/**
 * The id to translate for a style panel section's heading. Falls back to the composed key for a
 * custom section.
 *
 * @internal
 */
export function stylePanelMessageId(stylePanelType: string): string {
	const key = stylePanelType as keyof typeof stylePanelMessages
	return stylePanelMessages[key]?.id ?? `style-panel.${stylePanelType}`
}
