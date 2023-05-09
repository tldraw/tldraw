import { TLShapeProps } from './records/TLShape'
import { SetValue } from './util-types'

/** @public */
export const TL_STYLE_TYPES = new Set([
	'color',
	'labelColor',
	'dash',
	'fill',
	'size',
	'opacity',
	'font',
	'align',
	'icon',
	'geo',
	'arrowheadStart',
	'arrowheadEnd',
	'spline',
] as const)

/** @public */
export type TLStyleType = SetValue<typeof TL_STYLE_TYPES>

/** @public */
export interface TLBaseStyle {
	type: TLStyleType
	icon: string
}

// Color

/** @public */
export const TL_COLOR_TYPES = new Set([
	'black',
	'grey',
	'light-violet',
	'violet',
	'blue',
	'light-blue',
	'yellow',
	'orange',
	'green',
	'light-green',
	'light-red',
	'red',
] as const)

/** @public */
export type TLColorType = SetValue<typeof TL_COLOR_TYPES>

/** @public */
export interface TLColorStyle extends TLBaseStyle {
	id: TLColorType
	type: 'color'
}

// Dash
/** @public */
export const TL_DASH_TYPES = new Set(['draw', 'solid', 'dashed', 'dotted'] as const)

/** @public */
export type TLDashType = SetValue<typeof TL_DASH_TYPES>

/** @public */
export interface TLDashStyle extends TLBaseStyle {
	id: TLDashType
	type: 'dash'
}

// Fill
/** @public */
export const TL_FILL_TYPES = new Set(['none', 'semi', 'solid', 'pattern'] as const)

/** @public */
export type TLFillType = SetValue<typeof TL_FILL_TYPES>

/** @public */
export interface TLFillStyle extends TLBaseStyle {
	id: TLFillType
	type: 'fill'
}

// Size
/** @public */
export const TL_SIZE_TYPES = new Set(['s', 'm', 'l', 'xl'] as const)

/** @public */
export type TLSizeType = SetValue<typeof TL_SIZE_TYPES>

/** @public */
export interface TLSizeStyle extends TLBaseStyle {
	id: TLSizeType
	type: 'size'
}

// Opacity

/** @public */
export const TL_OPACITY_TYPES = new Set(['0.1', '0.25', '0.5', '0.75', '1'] as const)

/** @public */
export type TLOpacityType = SetValue<typeof TL_OPACITY_TYPES>

/** @public */
export interface TLOpacityStyle extends TLBaseStyle {
	id: TLOpacityType
	type: 'opacity'
}

// Font
/** @public */
export const TL_FONT_TYPES = new Set(['draw', 'sans', 'serif', 'mono'] as const)

/** @public */
export type TLFontType = SetValue<typeof TL_FONT_TYPES>

/** @public */
export interface TLFontStyle extends TLBaseStyle {
	id: TLFontType
	type: 'font'
}

// Text Align
/** @public */
export const TL_ALIGN_TYPES = new Set(['start', 'middle', 'end'] as const)

/** @public */
export type TLAlignType = SetValue<typeof TL_ALIGN_TYPES>

/** @public */
export interface TLAlignStyle extends TLBaseStyle {
	id: TLAlignType
	type: 'align'
}

// Geo

/** @public */
export const TL_GEO_TYPES = new Set([
	'rectangle',
	'ellipse',
	'triangle',
	'diamond',
	'pentagon',
	'hexagon',
	'octagon',
	'star',
	'rhombus',
	'rhombus-2',
	'oval',
	'trapezoid',
	'arrow-right',
	'arrow-left',
	'arrow-up',
	'arrow-down',
	'x-box',
	'check-box',
] as const)

/** @public */
export type TLGeoType = SetValue<typeof TL_GEO_TYPES>

/** @public */
export interface TLGeoStyle extends TLBaseStyle {
	id: TLGeoType
	type: 'geo'
}

/** @public */
export const TL_ARROWHEAD_TYPES = new Set([
	'arrow',
	'triangle',
	'square',
	'dot',
	'pipe',
	'diamond',
	'inverted',
	'bar',
	'none',
] as const)

/** @public */
export type TLArrowheadType = SetValue<typeof TL_ARROWHEAD_TYPES>

/** @public */
export const TL_SPLINE_TYPES = new Set(['cubic', 'line'] as const)

/** @public */
export type TLSplineType = SetValue<typeof TL_SPLINE_TYPES>

/** @public */
export interface TLArrowheadStartStyle extends TLBaseStyle {
	id: TLArrowheadType
	type: 'arrowheadStart'
}

/** @public */
export interface TLArrowheadEndStyle extends TLBaseStyle {
	id: TLArrowheadType
	type: 'arrowheadEnd'
}

/** @public */
export interface TLSplineTypeStyle extends TLBaseStyle {
	id: TLSplineType
	type: 'spline'
}

// Text Align

/** @public */
export const TL_ICON_TYPES = new Set([
	'activity',
	'airplay',
	'alert-circle',
	'alert-octagon',
	'alert-triangle',
	'align-center',
	'align-justify',
	'align-left',
	'align-right',
	'anchor',
	'aperture',
	'archive',
	'arrow-down-circle',
	'arrow-down-left',
	'arrow-down-right',
	'arrow-down',
	'arrow-left-circle',
	'arrow-left',
	'arrow-right-circle',
	'arrow-right',
	'arrow-up-circle',
	'arrow-up-left',
	'arrow-up-right',
	'arrow-up',
	'at-sign',
	'award',
	'bar-chart-2',
	'bar-chart',
	'battery-charging',
	'battery',
	'bell-off',
	'bell',
	'bluetooth',
	'bold',
	'book-open',
	'book',
	'bookmark',
	'geo',
	'briefcase',
	'calendar',
	'camera-off',
	'camera',
	'cast',
	'check-circle',
	'check-square',
	'check',
	'chevron-down',
	'chevron-left',
	'chevron-right',
	'chevron-up',
	'chevrons-down',
	'chevrons-left',
	'chevrons-right',
	'chevrons-up',
	'chrome',
	'circle',
	'clipboard',
	'clock',
	'cloud-drizzle',
	'cloud-lightning',
	'cloud-off',
	'cloud-rain',
	'cloud-snow',
	'cloud',
	'codepen',
	'codesandbox',
	'coffee',
	'columns',
	'command',
	'compass',
	'copy',
	'corner-down-left',
	'corner-down-right',
	'corner-left-down',
	'corner-left-up',
	'corner-right-down',
	'corner-right-up',
	'corner-up-left',
	'corner-up-right',
	'cpu',
	'credit-card',
	'crop',
	'crosshair',
	'database',
	'delete',
	'disc',
	'divide-circle',
	'divide-square',
	'divide',
	'dollar-sign',
	'download-cloud',
	'download',
	'dribbble',
	'droplet',
	'edit-2',
	'edit-3',
	'edit',
	'external-link',
	'eye-off',
	'eye',
	'facebook',
	'fast-forward',
	'feather',
	'figma',
	'file-minus',
	'file-plus',
	'file-text',
	'file',
	'film',
	'filter',
	'flag',
	'folder-minus',
	'folder-plus',
	'folder',
	'framer',
	'frown',
	'gift',
	'git-branch',
	'git-commit',
	'git-merge',
	'git-pull-request',
	'github',
	'gitlab',
	'globe',
	'grid',
	'hard-drive',
	'hash',
	'headphones',
	'heart',
	'help-circle',
	'hexagon',
	'home',
	'image',
	'inbox',
	'info',
	'instagram',
	'italic',
	'key',
	'layers',
	'layout',
	'life-buoy',
	'link-2',
	'link',
	'linkedin',
	'list',
	'loader',
	'lock',
	'log-in',
	'log-out',
	'mail',
	'map-pin',
	'map',
	'maximize-2',
	'maximize',
	'meh',
	'menu',
	'message-circle',
	'message-square',
	'mic-off',
	'mic',
	'minimize-2',
	'minimize',
	'minus-circle',
	'minus-square',
	'minus',
	'monitor',
	'moon',
	'more-horizontal',
	'more-vertical',
	'mouse-pointer',
	'move',
	'music',
	'navigation-2',
	'navigation',
	'octagon',
	'package',
	'paperclip',
	'pause-circle',
	'pause',
	'pen-tool',
	'percent',
	'phone-call',
	'phone-forwarded',
	'phone-incoming',
	'phone-missed',
	'phone-off',
	'phone-outgoing',
	'phone',
	'pie-chart',
	'play-circle',
	'play',
	'plus-circle',
	'plus-square',
	'plus',
	'pocket',
	'power',
	'printer',
	'radio',
	'refresh-ccw',
	'refresh-cw',
	'repeat',
	'rewind',
	'rotate-ccw',
	'rotate-cw',
	'rss',
	'save',
	'scissors',
	'search',
	'send',
	'server',
	'settings',
	'share-2',
	'share',
	'shield-off',
	'shield',
	'shopping-bag',
	'shopping-cart',
	'shuffle',
	'sidebar',
	'skip-back',
	'skip-forward',
	'slack',
	'slash',
	'sliders',
	'smartphone',
	'smile',
	'speaker',
	'square',
	'star',
	'stop-circle',
	'sun',
	'sunrise',
	'sunset',
	'table',
	'tablet',
	'tag',
	'target',
	'terminal',
	'thermometer',
	'thumbs-down',
	'thumbs-up',
	'toggle-left',
	'toggle-right',
	'tool',
	'trash-2',
	'trash',
	'trello',
	'trending-down',
	'trending-up',
	'triangle',
	'truck',
	'tv',
	'twitch',
	'twitter',
	'type',
	'umbrella',
	'underline',
	'unlock',
	'upload-cloud',
	'upload',
	'user-check',
	'user-minus',
	'user-plus',
	'user-x',
	'user',
	'users',
	'video-off',
	'video',
	'voicemail',
	'volume-1',
	'volume-2',
	'volume-x',
	'volume',
	'watch',
	'wifi-off',
	'wifi',
	'wind',
	'x-circle',
	'x-octagon',
	'x-square',
	'x',
	'youtube',
	'zap-off',
	'zap',
	'zoom-in',
	'zoom-out',
] as const)

/** @public */
export type TLIconType = SetValue<typeof TL_ICON_TYPES>

/** @public */
export interface TLIconStyle extends TLBaseStyle {
	id: TLIconType
	type: 'icon'
}

/** @public */
export type TLStyleItem =
	| TLColorStyle
	| TLDashStyle
	| TLFillStyle
	| TLSizeStyle
	| TLOpacityStyle
	| TLFontStyle
	| TLAlignStyle
//	| TLIconStyle

/** @public */
export interface TLStyleCollections {
	color: TLColorStyle[]
	fill: TLFillStyle[]
	dash: TLDashStyle[]
	size: TLSizeStyle[]
	opacity: TLOpacityStyle[]
	font: TLFontStyle[]
	align: TLAlignStyle[]
	geo: TLGeoStyle[]
	arrowheadStart: TLArrowheadStartStyle[]
	arrowheadEnd: TLArrowheadEndStyle[]
	spline: TLSplineTypeStyle[]
}

/** @public */
export type TLStyleProps = Pick<TLShapeProps, TLStyleType>
